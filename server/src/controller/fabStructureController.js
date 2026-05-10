/**
 * FAB 结构控制器
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/fabStructureService.js';

export const generateFAB = wrapController(async (req, res) => {
    const { productName, features, category, style } = req.body;
    const fabData = await svc.generateFAB({ productName, features, category, style });
    const formatted = svc.formatFAB(fabData);
    return success(res, {
      ...fabData,
      formatted,
    }, `FAB卖点结构生成成功 (${fabData.total}条)`);
}

export const getTemplates = wrapController(async (req, res) => {
    return success(res, {
      mapping: Object.keys(svc.ADVANTAGE_TO_BENEFIT).length + ' 条内置映射',
      archetypes: Object.keys(svc.BENEFIT_ARCHETYPES).length + ' 类受益模板',
      styles: ['standard', 'social', 'concise'],
    });
}
