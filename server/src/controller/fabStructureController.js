/**
 * FAB 结构控制器
 */
import { success } from '../utils/response.js';
import * as svc from '../services/fabStructureService.js';

export async function generateFAB(req, res) {
  const { productName, features, category, style } = req.body;
  const fabData = await svc.generateFAB({ productName, features, category, style });
  const formatted = svc.formatFAB(fabData);
  return success(res, {
    ...fabData,
    formatted,
  }, `FAB卖点结构生成成功 (${fabData.total}条)`);
}

export async function getTemplates(req, res) {
  return success(res, {
    mapping: Object.keys(svc.ADVANTAGE_TO_BENEFIT).length + ' 条内置映射',
    archetypes: Object.keys(svc.BENEFIT_ARCHETYPES).length + ' 类受益模板',
    styles: ['standard', 'social', 'concise'],
  });
}
