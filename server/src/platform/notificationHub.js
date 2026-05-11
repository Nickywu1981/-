/**
 * Platform — 通知中心
 *
 * 四层架构 - 中台层 - 通知中心
 * 职责: 站内信/SMS/邮件/WebSocket 统一发送抽象
 *
 * 统一通知类型:
 *  - system:  系统通知(维护/升级)
 *  - billing: 账单通知(消费/充值/到期)
 *  - task:    任务通知(生成完成/失败)
 *  - marketing: 营销通知(活动/促销)
 *  - alert:   告警通知(异常/风控)
 */

// 各通道实际实现懒加载，避免循环依赖
let _inAppService, _smsService, _emailService, _wsManager;

async function getInAppService() {
  if (!_inAppService) {
    _inAppService = (await import('../services/notificationService.js')).default || (await import('../services/notificationService.js'));
  }
  return _inAppService;
}

async function getSmsService() {
  if (!_smsService) {
    _smsService = (await import('../services/smsService.js')).default || (await import('../services/smsService.js'));
  }
  return _smsService;
}

async function getEmailService() {
  if (!_emailService) {
    _emailService = (await import('../services/emailService.js')).default || (await import('../services/emailService.js'));
  }
  return _emailService;
}

/**
 * 通知渠道枚举
 */
export const NOTIFY_CHANNELS = {
  IN_APP: 'in_app',
  SMS: 'sms',
  EMAIL: 'email',
  WEBSOCKET: 'websocket',
};

/**
 * 通知类型枚举
 */
export const NOTIFY_TYPES = {
  SYSTEM: 'system',
  BILLING: 'billing',
  TASK: 'task',
  MARKETING: 'marketing',
  ALERT: 'alert',
};

/**
 * 统一发送通知
 * @param {Object} opts
 * @param {number} opts.userId - 接收用户ID
 * @param {string} opts.title - 通知标题
 * @param {string} opts.content - 通知内容
 * @param {string} opts.type - 通知类型 (NOTIFY_TYPES)
 * @param {string[]} [opts.channels] - 发送渠道，默认 ['in_app']
 * @param {Object} [opts.meta] - 附加元数据
 */
export async function sendNotification({ userId, title, content, type = NOTIFY_TYPES.SYSTEM, channels = [NOTIFY_CHANNELS.IN_APP], meta = {} }) {
  const results = {};

  for (const channel of channels) {
    try {
      switch (channel) {
        case NOTIFY_CHANNELS.IN_APP: {
          const svc = await getInAppService();
          await svc.sendToUser?.(userId, { title, content, type, meta });
          results[channel] = 'ok';
          break;
        }
        case NOTIFY_CHANNELS.SMS: {
          const svc = await getSmsService();
          if (meta.phone) {
            await svc.sendNotification?.(meta.phone, content);
            results[channel] = 'ok';
          } else {
            results[channel] = 'skip: no phone';
          }
          break;
        }
        case NOTIFY_CHANNELS.EMAIL: {
          const svc = await getEmailService();
          if (meta.email) {
            await svc.sendNotification?.(meta.email, title, content);
            results[channel] = 'ok';
          } else {
            results[channel] = 'skip: no email';
          }
          break;
        }
        case NOTIFY_CHANNELS.WEBSOCKET: {
          if (!_wsManager) {
            try {
              _wsManager = (await import('../services/wsManager.js')).default || (await import('../services/wsManager.js'));
            } catch { /* ws not available */ }
          }
          if (_wsManager) {
            _wsManager.sendToUser?.(userId, { type: 'notification', data: { title, content, type, meta } });
            results[channel] = 'ok';
          } else {
            results[channel] = 'unavailable';
          }
          break;
        }
        default:
          results[channel] = 'unsupported';
      }
    } catch (err) {
      results[channel] = `error: ${err.message}`;
    }
  }

  return results;
}

/**
 * 批量发送通知
 * @param {Object} opts
 * @param {number[]} opts.userIds
 * @param {string} opts.title
 * @param {string} opts.content
 * @param {string} opts.type
 * @param {string[]} [opts.channels]
 */
export async function sendBatchNotification({ userIds, title, content, type = NOTIFY_TYPES.MARKETING, channels = [NOTIFY_CHANNELS.IN_APP] }) {
  const results = [];
  for (const userId of userIds) {
    const r = await sendNotification({ userId, title, content, type, channels });
    results.push({ userId, ...r });
  }
  return results;
}
