/**
 * FAB 结构控制器
 */
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/fabStructureService.js';

export async function generateFAB(req, res) {
  try {
    const { productName, features, category, style } = req.body;
    const fabData = await svc.generateFAB({ productName, features, category, style });
    const formatted = svc.formatFAB(fabData);
    return success(res, {
      ...fabData,
      formatted,
    }, `FAB卖点结构生成成功 (${fabData.total}条)`);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function getTemplates(req, res) {
  try {
    return success(res, {
      mapping: Object.keys(svc.ADVANTAGE_TO_BENEFIT).length + ' 条内置映射',
      archetypes: Object.keys(svc.BENEFIT_ARCHETYPES).length + ' 类受益模板',
      styles: ['standard', 'social', 'concise'],
    });
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}
