/**
 * 工作流 — Service
 */
import * as wfDao from '../dao/workflowDao.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

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

// ─── 步骤执行器（对接真实 AI 模型） ───
async function executeStep(step, context) {
  const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');

  switch (step.type) {
    case 'generate_text': {
      const textPrompt = step.prompt || `为商品 "${context.product_name || context.topic || '未指定'}" 生成电商营销文案`;
      const result = await gatewayInfer('gpt-4o-mini', {
        prompt: textPrompt,
        systemPrompt: '你是资深电商文案专家，输出吸引人的营销文案。',
        temperature: 0.8,
      }, { userId: context.userId, tenantId: context.tenantId, taskType: 'text_gen', source: 'workflow' });
      return { copy_text: result?.text || result?.output?.text || '' };
    }

    case 'generate_image': {
      const imgPrompt = step.prompt || `professional e-commerce product photography of ${context.product_name || 'product'}, studio lighting, white background, 8k`;
      const result = await gatewayInfer('gpt-image-2', {
        prompt: imgPrompt,
        size: step.size || '1024x1024',
        n: step.n || 1,
      }, { userId: context.userId, tenantId: context.tenantId, taskType: 'image_gen', source: 'workflow' });
      const urls = (result?.images || []).map((img) => img.url).filter(Boolean);
      return { image_urls: urls.length ? urls : [result?.file_url || result?.url].filter(Boolean) };
    }

    case 'generate_voice': {
      const voiceText = step.text || context.copy_text || '欢迎使用AI电商工具箱';
      const result = await gatewayInfer('edge-tts', {
        text: voiceText,
        voice: step.voice || 'zh-CN-XiaoxiaoNeural',
      }, { userId: context.userId, tenantId: context.tenantId, taskType: 'tts', source: 'workflow' });
      return { audio_url: result?.audioUrl || result?.url || '' };
    }

    case 'generate_video': {
      const videoPrompt = step.prompt || `product showcase video of ${context.product_name || 'product'}, cinematic quality`;
      const result = await gatewayInfer('seedance', {
        prompt: videoPrompt,
        imageUrl: context.image_urls?.[0] || step.imageUrl,
        duration: step.duration || 5,
        resolution: step.resolution || '1080p',
      }, { userId: context.userId, tenantId: context.tenantId, taskType: 'video_gen', source: 'workflow' });
      return { video_url: result?.videoUrl || result?.output?.video_url || '' };
    }

    case 'export': {
      // 导出步骤：收集所有前置步骤的输出
      return {
        download_url: context.download_url || '',
        exported_data: {
          text: context.copy_text || '',
          images: context.image_urls || [],
          audio: context.audio_url || '',
          video: context.video_url || '',
        },
      };
    }

    default:
      throw new BusinessError(400, `不支持的步骤类型: ${step.type}`);
  }
}

function parseSteps(val) {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}
