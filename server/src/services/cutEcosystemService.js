/**
 * Movio AI v4.1 — Cut Ecosystem Service (剪映/CapCut 生态对接)
 * G5 后端开发 | M05 #29-30
 * 导出视频/图片为剪映/CapCut兼容格式，支持一键导入编辑
 */
import { BusinessError } from '../utils/businessError.js';
import * as worksDao from '../dao/worksDao.js';
import path from 'path';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const VIDEO_TASK_TYPES = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'];

function parseWorkData(w) {
  let data = {};
  try { data = typeof w.result_data === 'string' ? JSON.parse(w.result_data) : (w.result_data || {}); } catch (e) { logger.warn('[CutEcosystem] JSON 解析失败', { id: w.id, error: e.message }); }
  const url = data.file_url || data.video_url || data.image_url || '';
  const filename = path.basename(url.split('?')[0]) || `asset_${w.id}.mp4`;
  const isVideo = VIDEO_TASK_TYPES.includes(w.task_type);
  return { id: w.id, filename, url, type: isVideo ? 'video' : 'image', duration: data.duration || (isVideo ? 5 : 3), title: w.title };
}

// CapCut / Jianying 项目文件模板
function buildJianyingDraft({ assets, projectName, ratio = '9:16' }) {
  const ratioMap = { '9:16': { w: 1080, h: 1920 }, '16:9': { w: 1920, h: 1080 }, '1:1': { w: 1080, h: 1080 } };
  const canvas = ratioMap[ratio] || ratioMap['9:16'];

  return {
    draft_name: projectName || 'Movio AI 导出项目',
    platform: 'jianying',
    canvas,
    tracks: [
      {
        type: 'video',
        clips: assets.filter(a => a.type === 'video').map((a, i) => ({
          id: `clip_${i}`, file: a.filename,
          start: i > 0 ? assets.slice(0, i).reduce((s, x) => s + (x.duration || 5), 0) : 0,
          duration: a.duration || 5,
          transition: i > 0 ? { type: 'dissolve', duration: 0.5 } : null,
        })),
      },
      {
        type: 'audio',
        clips: assets.filter(a => a.type === 'audio').map((a, i) => ({ id: `audio_${i}`, file: a.filename, start: 0, duration: a.duration || 10, volume: 0.8 })),
      },
      {
        type: 'image',
        clips: assets.filter(a => a.type === 'image').map((a, i) => ({ id: `img_${i}`, file: a.filename, start: i * 3, duration: 3 })),
      },
    ],
    effects: [],
    subtitles: [],
    exportSettings: { format: 'mp4', quality: 'high', framerate: 30 },
  };
}

export async function exportJianyingDraft(userId, { workIds, projectName, ratio }) {
  if (!workIds?.length) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const works = await worksDao.findWorksByIds(workIds, userId);
  if (!works.length) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);

  const assets = works.map(parseWorkData);
  const draft = buildJianyingDraft({ assets, projectName, ratio });

  return { draft, assets, platform: 'jianying', downloadUrl: null };
}

export async function exportCapCutDraft(userId, { workIds, projectName, ratio }) {
  const result = await exportJianyingDraft(userId, { workIds, projectName, ratio });
  result.platform = 'capcut';
  result.draft.platform = 'capcut';
  return result;
}

export function getPlatformRatios() {
  return [
    { key: '9:16', label: '抖音/快手/TikTok/Reels', w: 1080, h: 1920 },
    { key: '16:9', label: 'B站/YouTube/横屏', w: 1920, h: 1080 },
    { key: '1:1', label: '淘宝/京东/Instagram', w: 1080, h: 1080 },
    { key: '4:5', label: '小红书/CapCut', w: 1080, h: 1350 },
    { key: '3:4', label: 'LinkedIn/Facebook', w: 1080, h: 1440 },
  ];
}

export async function getUserExportableWorks(userId, { page = 1, pageSize = 20, type } = {}) {
  const result = await worksDao.findExportableWorks(userId, { page, pageSize, type });
  return {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    list: result.list.map(parseWorkData),
  };
}
