import { listModels } from './aiEngine.js';

export const MODEL_CATEGORIES = ['text', 'image', 'video', 'audio'];

const categoryMap = new Map();

export function categorizeModels() {
  categoryMap.clear();
  for (const cat of MODEL_CATEGORIES) categoryMap.set(cat, []);

  const all = listModels();
  for (const m of all) {
    const cat = m.type || m.category || 'text';
    if (categoryMap.has(cat)) {
      categoryMap.get(cat).push(m);
    }
  }
  return Object.fromEntries(categoryMap);
}

export function getModelsByCategory(category) {
  if (!categoryMap.has(category)) categorizeModels();
  return categoryMap.get(category) || [];
}

export function getCategories() {
  return Object.fromEntries(
    MODEL_CATEGORIES.map((cat) => [cat, getModelsByCategory(cat).map((m) => m.id)]),
  );
}

const TASK_CATEGORY_MAP = {
  // text
  text_gen: 'text', script_gen: 'text', title_gen: 'text', translate: 'text',
  compliance_check: 'text', caption_gen: 'text', seo_text: 'text',
  // image
  cutout: 'image', cutout_hq: 'image', bg_white: 'image', scene_gen: 'image',
  image_enhance: 'image', img_expand: 'image', ghost_mannequin: 'image',
  poster_gen: 'image', color_swap: 'image', style_transfer: 'image',
  virtual_tryon: 'image', watermark: 'image',
  // video
  img2video: 'video', multi2video: 'video', video_edit: 'video',
  video_packaging: 'video', action_transfer: 'video', person_replace: 'video',
  digital_human: 'video', voice_gen: 'audio', voice_clone: 'audio', tts: 'audio',
};

export function getTaskCategory(taskType) {
  return TASK_CATEGORY_MAP[taskType] || 'text';
}
