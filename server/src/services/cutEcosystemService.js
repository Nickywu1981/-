/**
 * Movio AI v4.1 — Cut Ecosystem Service (剪映/CapCut 生态对接)
 * G5 后端开发 | M05 #29-30
 * 导出视频/图片为剪映/CapCut兼容格式，支持一键导入编辑
 */
import { BusinessError } from '../utils/businessError.js';
import db from '../dao/db.js';
import path from 'path';
import logger from '../utils/logger.js';

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
        clips: assets
          .filter(a => a.type === 'video')
          .map((a, i) => ({
            id: `clip_${i}`,
            file: a.filename,
            start: i > 0 ? assets.slice(0, i).reduce((s, x) => s + (x.duration || 5), 0) : 0,
            duration: a.duration || 5,
            transition: i > 0 ? { type: 'dissolve', duration: 0.5 } : null,
          })),
      },
      {
        type: 'audio',
        clips: assets
          .filter(a => a.type === 'audio')
          .map((a, i) => ({ id: `audio_${i}`, file: a.filename, start: 0, duration: a.duration || 10, volume: 0.8 })),
      },
      {
        type: 'image',
        clips: assets
          .filter(a => a.type === 'image')
          .map((a, i) => ({ id: `img_${i}`, file: a.filename, start: i * 3, duration: 3 })),
      },
    ],
    effects: [],
    subtitles: [],
    exportSettings: { format: 'mp4', quality: 'high', framerate: 30 },
  };
}

export default {
  // ============================================================
  // 生成剪映项目文件
  // ============================================================
  async exportJianyingDraft(userId, { workIds, projectName, ratio }) {
    if (!workIds?.length) throw new BusinessError(400, '请选择至少一个作品');

    const conn = await db.getConnection();
    let works;
    try {
      const placeholders = workIds.map(() => '?').join(',');
      const [rows] = await conn.query(
        `SELECT id, task_type, result_data, title, create_time FROM works WHERE id IN (${placeholders}) AND user_id = ? AND status = 2`,
        [...workIds, userId],
      );
      works = rows;
    } finally {
      conn.release();
    }

    if (!works.length) throw new BusinessError(404, '未找到已完成的作品');

    const assets = works.map(w => {
      let data = {};
      try { data = typeof w.result_data === 'string' ? JSON.parse(w.result_data) : (w.result_data || {}); } catch (e) { logger.warn('[CutEcosystem] JSON 解析失败', { id: w.id, error: e.message }); }
      const url = data.file_url || data.video_url || data.image_url || '';
      const filename = path.basename(url.split('?')[0]) || `asset_${w.id}.mp4`;

      const isVideo = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'].includes(w.task_type);
      return {
        id: w.id, filename, url,
        type: isVideo ? 'video' : 'image',
        duration: data.duration || (isVideo ? 5 : 3),
        title: w.title,
      };
    });

    const draft = buildJianyingDraft({ assets, projectName, ratio });

    return { draft, assets, platform: 'jianying', downloadUrl: null };
  },

  // ============================================================
  // 生成 CapCut 项目文件
  // ============================================================
  async exportCapCutDraft(userId, { workIds, projectName, ratio }) {
    const result = await this.exportJianyingDraft(userId, { workIds, projectName, ratio });
    result.platform = 'capcut';
    result.draft.platform = 'capcut';
    return result;
  },

  // ============================================================
  // 画幅适配（转码为平台规范尺寸）
  // ============================================================
  getPlatformRatios() {
    return [
      { key: '9:16', label: '抖音/快手/TikTok/Reels', w: 1080, h: 1920 },
      { key: '16:9', label: 'B站/YouTube/横屏', w: 1920, h: 1080 },
      { key: '1:1', label: '淘宝/京东/Instagram', w: 1080, h: 1080 },
      { key: '4:5', label: '小红书/CapCut', w: 1080, h: 1350 },
      { key: '3:4', label: 'LinkedIn/Facebook', w: 1080, h: 1440 },
    ];
  },

  // ============================================================
  // 获取用户可导出的已完成作品列表
  // ============================================================
  async getUserExportableWorks(userId, { page = 1, pageSize = 20, type } = {}) {
    const conn = await db.getConnection();
    try {
      let where = 'user_id = ? AND status = 2';
      const params = [userId];
      if (type) { where += ' AND task_type = ?'; params.push(type); }

      const [[{ total }]] = await conn.query(`SELECT COUNT(*) as total FROM works WHERE ${where}`, params);
      const [rows] = await conn.query(
        `SELECT id, task_type, title, thumbnail_url, result_data, create_time FROM works WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      );

      const list = rows.map(r => {
        let data = {};
        try { data = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : (r.result_data || {}); } catch (e) { logger.warn('[CutEcosystem] 作品数据JSON解析失败', { id: r.id, error: e?.message }); }
        const url = data.file_url || data.video_url || data.image_url || '';
        const isVideo = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'].includes(r.task_type);
        return { id: r.id, task_type: r.task_type, title: r.title, thumbnail: r.thumbnail_url, url, type: isVideo ? 'video' : 'image', create_time: r.create_time };
      });

      return { total, page, pageSize, list };
    } finally {
      conn.release();
    }
  },
};
