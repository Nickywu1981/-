import * as taskDao from '../dao/taskDao.js';
import { parsePagination } from '../utils/pagination.js';

const IMAGE_TYPES = [
  'remove-bg', 'white-bg', 'scene', 'retouch', 'outpaint',
  'virtual-tryon', 'color-swap', 'style-transfer', 'ghost-mannequin',
  'wrinkle-remove', 'batch_image',
];

const VIDEO_TYPES = [
  'img-to-video', 'multi-img-synthesis', 'batch_video', 'video-edit',
  'viral-clone', 'voice-gen', 'voice-clone',
];

/**
 * 查询用户作品列表（支持按大类筛选）
 */
export async function listMyWorks(userId, query) {
  const { page, pageSize, offset, sort, _order } = parsePagination(query, { defaultSort: 'create_time' });

  const filters = {};
  if (query.type === 'image') filters.type = IMAGE_TYPES;
  else if (query.type === 'video') filters.type = VIDEO_TYPES;

  const [list, total] = await Promise.all([
    taskDao.listUserTasks(userId, { ...filters, page, pageSize }),
    taskDao.countUserTasks(userId, filters),
  ]);

  return { list, total, page, pageSize };
}
