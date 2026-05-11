/**
 * RAG 检索增强生成服务
 * 将知识库搜索结果组装为 LLM 可消费的上下文
 */
import { searchFullContext } from './memoryEmbedService.js';

/**
 * 检索上下文
 * @param {string} query - 查询文本
 * @param {Object} [opts]
 * @param {number} [opts.topK=5] - 返回条数
 * @param {'compact'|'structured'} [opts.format='compact'] - compact 返回拼接文本，structured 返回结构化数据
 */
export async function retrieveContext(query, { topK = 5, format = 'compact' } = {}) {
  const { results, model, totalChunks } = await searchFullContext(query, topK);

  if (format === 'compact') {
    const context = results.length > 0
      ? results.map((r, i) => `[Source ${i + 1}: ${r.source}]\n${r.content}`).join('\n\n---\n\n')
      : '';
    return { context, sources: results.map(r => r.source), model, totalChunks, hitCount: results.length };
  }

  return { results, model, totalChunks };
}

/**
 * 组装 RAG 增强 Prompt
 * @param {string} userQuery - 用户问题
 * @param {string} context - retrieveContext 返回的上下文
 * @param {string} [systemPrompt] - 自定义系统提示词
 */
export function buildRAGPrompt(userQuery, context, systemPrompt) {
  const sys = systemPrompt
    || 'You are the Movio AI assistant. Answer questions based on the provided project knowledge base. If the answer is not in the context, say "I don\'t have enough information in the knowledge base." Cite source names when possible.';

  return {
    system: `${sys}\n\n## Project Knowledge Base\n${context || '(No relevant context found.)'}\n\nAnswer using ONLY the above knowledge.`,
    user: userQuery,
  };
}

export default { retrieveContext, buildRAGPrompt };
