/**
 * 工作流 — Service
 */
import * as wfDao from '../dao/workflowDao.js';
import logger from '../utils/logger.js';

// ─── 模板操作 ───
export async function listTemplates(filter) {
  const rows = await wfDao.listTemplates(filter);
  return rows.map(r => ({ ...r, steps: parseSteps(r.steps) }));
}

export async function getTemplate(id) {
  const row = await wfDao.getTemplate(id);
  if (!row) return null;
  return { ...row, steps: parseSteps(row.steps) };
}

export async function createTemplate(data) {
  return wfDao.createTemplate(data);
}

export async function updateTemplate(id, data) {
  return wfDao.updateTemplate(id, data);
}

export async function deleteTemplate(id) {
  return wfDao.deleteTemplate(id);
}

// ─── 作业执行 ───
export async function executeWorkflow(templateId, userId, inputData) {
  const template = await getTemplate(templateId);
  if (!template) throw Object.assign(new Error('模板不存在'), { code: 'NOT_FOUND' });
  if (template.status !== 'published') throw Object.assign(new Error('模板未发布'), { code: 'INVALID_STATUS' });

  const jobId = await wfDao.createJob({
    templateId: template.id,
    templateName: template.name,
    userId,
    inputData,
  });

  // 异步执行，不阻塞返回
  setImmediate(() => runJob(jobId, template.steps, inputData).catch(err => {
    logger.error(`[Workflow] job=${jobId} failed: ${err.message}`);
    wfDao.updateJobStatus(jobId, { status: 'failed', errorMessage: err.message?.substring(0, 500) });
  }));

  return jobId;
}

export async function getJob(id) {
  const row = await wfDao.getJob(id);
  if (!row) return null;
  if (row.step_results) row.step_results = parseSteps(row.step_results);
  if (row.input_data) row.input_data = parseSteps(row.input_data);
  if (row.output_data) row.output_data = parseSteps(row.output_data);
  return row;
}

export async function listJobs(userId, pagination) {
  return wfDao.listJobsByUser(userId, pagination);
}

export async function cancelJob(id) {
  const job = await wfDao.getJob(id);
  if (!job) throw Object.assign(new Error('作业不存在'), { code: 'NOT_FOUND' });
  if (!['pending', 'running'].includes(job.status)) {
    throw Object.assign(new Error('仅可取消等待/运行中的作业'), { code: 'INVALID_STATUS' });
  }
  return wfDao.cancelJob(id);
}

// ─── 内部：异步逐步执行工作流 ───
async function runJob(jobId, steps, inputData) {
  await wfDao.updateJobStatus(jobId, { status: 'running', progress: 0 });
  const stepResults = [];
  let context = { ...inputData };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const startedAt = new Date().toISOString();
    try {
      const output = await executeStep(step, context);
      stepResults.push({ step: step.label || step.type, status: 'completed', startedAt, completedAt: new Date().toISOString(), output });
      context = { ...context, ...output };
    } catch (err) {
      stepResults.push({ step: step.label || step.type, status: 'failed', startedAt, completedAt: new Date().toISOString(), error: err.message });
      await wfDao.updateJobStatus(jobId, { status: 'failed', stepResults, errorMessage: `步骤 "${step.label}" 执行失败: ${err.message}`.substring(0, 500), progress: Math.floor((i / steps.length) * 100) });
      return;
    }
    const progress = Math.floor(((i + 1) / steps.length) * 100);
    await wfDao.updateJobStatus(jobId, { progress, stepResults });
  }

  await wfDao.updateJobStatus(jobId, {
    status: 'completed',
    progress: 100,
    outputData: context,
    stepResults,
  });
  logger.info(`[Workflow] job=${jobId} completed, ${steps.length} steps`);
}

// ─── 步骤执行器 ───
async function executeStep(step, context) {
  // 模拟 AI 步骤执行（MVP 阶段规则引擎模拟，后续接真实 LLM）
  const delay = 200 + Math.random() * 600; // 模拟延迟

  switch (step.type) {
    case 'generate_text': {
      await sleep(delay);
      const topic = context.product_name || context.topic || '未指定主题';
      return { copy_text: `【AI生成】${topic} — 限时特惠，品质保障！点击了解详情 →` };
    }
    case 'generate_image': {
      await sleep(delay * 2);
      return { image_urls: ['https://placehold.co/800x800/png?text=AI+Generated'] };
    }
    case 'generate_voice': {
      await sleep(delay);
      return { audio_url: 'https://example.com/ai-voice-output.mp3' };
    }
    case 'generate_video': {
      await sleep(delay * 3);
      return { video_url: 'https://example.com/ai-video-output.mp4' };
    }
    case 'export': {
      await sleep(delay);
      return { download_url: 'https://example.com/export/batch-output.zip' };
    }
    default:
      throw new Error(`不支持的步骤类型: ${step.type}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function parseSteps(val) {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}
