/**
 * Chat Controller — 对话模块控制器
 * 职责：参数校验委托 + 响应格式统一，不写业务逻辑
 */
import { success, error } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as chatService from '../services/chatService.js';
import logger from '../utils/logger.js';

export async function sendMessage(req, res) {
  const { message, sessionId, mode, attachments, context } = req.body;
  const userId = req.user?.id || req.user?.userId;

  try {
    await chatService.handleMessage({
      res,
      req,
      message,
      sessionId,
      mode,
      attachments,
      context,
      userId,
    });
    // handleMessage 内部管理 SSE 生命周期，不需要这里再 send
  } catch (err) {
    logger.error('[Chat] sendMessage failed', err.message);
    if (!res.headersSent) {
      if (err instanceof BusinessError) {
        error(res, err.code, err.message);
      } else {
        error(res, ERROR_CODE.AI_INFER_FAILED);
      }
    }
  }
}

export async function getSuggestions(req, res) {
  try {
    const suggestions = [
    { id: 'main_image', label: '生成商品主图', icon: 'image', prompt: '帮我生成一张白色连衣裙的主图，简约风格' },
    { id: 'scene_image', label: '生成场景图', icon: 'image', prompt: '把这张产品图放到咖啡厅场景中' },
    { id: 'remove_bg', label: '去除背景', icon: 'cut', prompt: '帮我去掉这张图的背景' },
    { id: 'copywriting', label: '写营销文案', icon: 'edit', prompt: '为这款产品写一段抖音带货文案' },
    { id: 'script', label: '写带货脚本', icon: 'video', prompt: '帮我写一段60秒的直播带货脚本' },
    { id: 'video_clone', label: '爆款视频复刻', icon: 'sparkles', prompt: '分析这个视频的结构，帮我生成复刻方案' },
    { id: 'translate', label: '跨境翻译', icon: 'globe', prompt: '将这段产品描述翻译成英文和日文' },
    { id: 'compliance', label: '合规检查', icon: 'shield', prompt: '帮我检查这段文案是否合规' },
  ];
  return success(res, suggestions);
  } catch (err) {
    logger.error('[Chat] getSuggestions failed', err.message);
    error(res, ERROR_CODE.INTERNAL_ERROR);
  }
}
