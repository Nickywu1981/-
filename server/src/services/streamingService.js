/**
 * 流式输出与异步调用管理服务 — Streaming & Async Manager
 *
 * 功能：
 * 1. SSE (Server-Sent Events) 流式输出封装
 * 2. Post-invoke 流式处理（边输出边审核 + 边日志）
 * 3. 异步任务模式（排队 + 回调通知）
 */
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

// ==================== SSE 流式输出 ====================

/**
 * 创建 SSE 流式响应
 * @param {object} res - Express response
 * @param {object} [req] - Express request（用于检测客户端断开）
 */
export function createSSEStream(res, req) {
  let clientDisconnected = false;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  req?.on('close', () => {
    clientDisconnected = true;
    if (!res.writableEnded) res.end();
  });

  function safeWrite(data) {
    if (res.writableEnded || clientDisconnected) return false;
    const ok = res.write(data);
    // 高水位 backpressure: 未能刷新到内核缓冲区时，暂停事件循环让 drain 触发
    if (!ok && !clientDisconnected) {
      logger.debug('[SSE] 缓冲区已满，等待客户端消费');
    }
    return ok;
  }

  return {
    send(data, event = 'message') {
      if (res.writableEnded || clientDisconnected) return;
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      safeWrite(`event: ${event}\ndata: ${payload}\n\n`);
    },

    error(message, code = 500) {
      if (res.writableEnded || clientDisconnected) return;
      safeWrite(`event: error\ndata: ${JSON.stringify({ message, code })}\n\n`);
      res.end();
    },

    done() {
      if (!res.writableEnded && !clientDisconnected) {
        safeWrite('event: done\ndata: [DONE]\n\n');
        res.end();
      }
    },

    get isDisconnected() { return clientDisconnected; },
    get raw() { return res; },
  };
}

// ==================== 流式内容处理器 ====================

/**
 * 流式输出管线处理器
 * 边接收模型输出 → 边审核 → 边推送客户端
 *
 * @param {object} sourceStream - 模型流式输出源 (AsyncIterable)
 * @param {object} sseStream - SSE 输出流
 * @param {object} [opts]
 * @param {Function} [opts.onChunk] - 每块回调 (chunk, index)
 * @param {Function} [opts.moderator] - 审核回调 (accumulated) => { passed, violations }
 * @param {number} [opts.moderateInterval=5] - 每N块审核一次
 */
export async function processStreamingOutput(sourceStream, sseStream, opts = {}) {
  const { onChunk, moderator, moderateInterval = 5 } = opts;
  let accumulated = '';
  let chunkIndex = 0;
  let blocked = false;

  try {
    for await (const chunk of sourceStream) {
      // 客户端已断开 → 停止从源流消费（避免浪费 AI 推理资源）
      if (sseStream.isDisconnected) break;
      if (blocked) break;

      const text = typeof chunk === 'string' ? chunk : chunk?.content || chunk?.text || '';
      accumulated += text;
      chunkIndex++;

      if (moderator && chunkIndex % moderateInterval === 0) {
        try {
          const result = await moderator(accumulated);
          if (!result.passed) {
            blocked = true;
            sseStream.send({ type: 'moderation_block', violations: result.violations }, 'error');
            break;
          }
        } catch (e) { logger.warn('[Streaming] 审核异常不中断流:', e.message); }
      }

      sseStream.send(text, 'token');
      onChunk?.(text, chunkIndex);
    }
  } catch (err) {
    if (!sseStream.isDisconnected) {
      logger.error(`[Streaming] 流式处理异常: ${err.message}`);
      sseStream.error('流式输出中断');
    }
    return { accumulated, blocked, error: err.message };
  }

  if (!blocked && !sseStream.isDisconnected) {
    sseStream.done();
  }

  return { accumulated, blocked };
}

// ==================== 异步任务模式 ====================

const taskQueue = [];
const taskResults = new Map();
let isProcessing = false;

/**
 * 提交异步 AI 任务
 * @param {object} task - { taskType, modelId, input, userId, callback }
 * @returns {string} taskId
 */
export function submitAsyncTask(task) {
  const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  taskQueue.push({
    taskId,
    taskType: task.taskType || 'unknown',
    modelId: task.modelId || 'gpt-4o-mini',
    input: task.input,
    userId: task.userId,
    callback: task.callback || null,
    status: 'queued',
    createdAt: Date.now(),
  });

  taskResults.set(taskId, { status: 'queued', progress: 0, result: null, error: null });

  logger.info(`[AsyncTask] 任务已入队: ${taskId} (queue=${taskQueue.length})`);

  // 触发处理
  processQueue();

  return taskId;
}

/**
 * 查询异步任务状态
 */
export function getTaskStatus(taskId) {
  return taskResults.get(taskId) || { status: 'not_found' };
}

/**
 * 处理队列
 * 注意：taskQueue/taskResults 为内存存储，进程重启会丢失。
 * 生产环境应替换为 Redis/BullMQ 持久化方案。
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  // 提前加载依赖，避免循环内重复 import
  const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');

  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    task.status = 'processing';
    taskResults.set(task.taskId, { status: 'processing', progress: 0 });

    try {
      taskResults.set(task.taskId, { status: 'processing', progress: 30 });

      const result = await gatewayInfer(task.modelId, task.input, {
        userId: task.userId,
        taskType: task.taskType,
        source: 'async',
      });

      taskResults.set(task.taskId, {
        status: 'completed',
        progress: 100,
        result: {
          output: result.output,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          cost: result.cost,
          elapsed: result.elapsed,
        },
      });

      // 回调通知
      if (task.callback) {
        try {
          await task.callback(null, taskResults.get(task.taskId));
        } catch (cbErr) {
          logger.warn(`[AsyncTask] 回调失败: ${cbErr.message}`);
        }
      }

      logger.info(`[AsyncTask] 任务完成: ${task.taskId}`);
    } catch (err) {
      taskResults.set(task.taskId, {
        status: 'failed',
        progress: 100,
        error: err.message,
      });

      if (task.callback) {
        try {
          await task.callback(err, taskResults.get(task.taskId));
        } catch { /* ignore */ }
      }

      logger.error(`[AsyncTask] 任务失败: ${task.taskId}, ${err.message}`);
    }
  }

  isProcessing = false;
}

// 定时清理过期结果（1小时后）
setInterval(() => {
  const now = Date.now();
  for (const [taskId, result] of taskResults) {
    if (result.status === 'completed' || result.status === 'failed') {
      // 从 taskId 提取时间戳
      const tsMatch = taskId.match(/task_(\w+)_/);
      if (tsMatch) {
        const ts = parseInt(tsMatch[1], 36);
        if (now - ts > 3600000) taskResults.delete(taskId);
      }
    }
  }
}, 300000).unref();

export default { createSSEStream, processStreamingOutput, submitAsyncTask, getTaskStatus };
