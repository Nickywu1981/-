/**
 * 任务通知器 — 任务完成时自动发送站内通知 + 短信
 * 所有 Service 的 process* 函数在任务完成时调用此模块
 */

import * as notificationService from './notificationService.js';
import * as smsService from './smsService.js';
import * as userDao from '../dao/userDao.js';
import logger from '../utils/logger.js';

/**
 * 任务完成时调用 — 发送通知 + 短信
 * @param {string} taskId
 * @param {number} userId
 * @param {{ type: string, title: string, result?: object }} info
 */
export async function notifyComplete(taskId, userId, { type, title, result: _result }) {
  try {
    const typeLabelMap = {
      main_image: '主图生成', scene: '场景图', detail_h5: '详情页',
      img2video: '视频生成', batch: '批量处理', multi_img2video: '多图合成',
      virtual_tryon: '虚拟模特', color_swap: '一键换色', style_transfer: '风格转化',
      wrinkle_remove: '去褶皱', image_translate: '图片翻译',
      action_transfer: '动作迁移', person_replace: '人物替换', digital_human: '口播数字人',
      script_gen: '带货脚本', shot_plan: '智能分镜', viral_clone: '爆款复刻',
    };
    const typeLabel = typeLabelMap[type] || type;

    // 站内通知
    await notificationService.sendNotification(userId, {
      type: 'task',
      title: `${typeLabel}任务完成`,
      content: `您的"${title}"已处理完毕，点击查看结果。`,
    });

    // 尝试发短信通知（用户需已绑定手机）
    trySendSms(userId, typeLabel);
  } catch (_err) {
    // 通知失败不应阻塞主流程
    logger.error('[TaskNotifier] 通知发送失败:', _err);
  }
}

async function trySendSms(userId, typeLabel) {
  try {
    const user = await userDao.findPhoneById(userId);
    if (!user?.phone) return;
    await smsService.sendNotification(user.phone, {
      templateCode: 'sms_task_complete',
      params: { task_type: typeLabel, count: '1' },
    });
  } catch (e) { logger.warn('任务完成短信通知失败', { userId, taskType: typeLabel, error: e.message }); }
}
