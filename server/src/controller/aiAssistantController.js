/**
 * AI 助手类 — Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { searchFAQ, reviewContent, queryDataAssistant } from '../services/aiAssistantService.js';
import logger from '../utils/logger.js';

export const askFAQ = wrapController(async (req, res) => {
  const { question } = req.body;
  if (!question) return success(res, { results: [], hint: '请输入问题，例如：如何充值积分' });
  const results = searchFAQ(question);
  logger.info(`[AI-FAQ] query="${question.substring(0, 50)}" matched=${results.length}`);
  return success(res, { results, total: results.length });
});

export const review = wrapController(async (req, res) => {
  const { text } = req.body;
  if (!text) return success(res, { pass: true, issues: [], hint: '请输入待审核文本' });
  const result = reviewContent(text);
  logger.info(`[AI-Review] score=${result.score} pass=${result.pass} issues=${result.issues.length}`);
  return success(res, result);
});

export const dataQuery = wrapController(async (req, res) => {
  const { question } = req.body;
  if (!question) return success(res, { answer: '请问有什么可以帮您分析？尝试询问用户数据、收入情况等。' });
  const result = queryDataAssistant(question);
  logger.info(`[AI-DataAssistant] q="${question.substring(0, 60)}"`);
  return success(res, result);
});
