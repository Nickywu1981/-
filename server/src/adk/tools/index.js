/**
 * ADK 共享工具索引
 *
 * 工具集中化 — 所有 Agent 从此目录取工具，不再在各 Agent 文件内内联定义。
 * 优势：
 *   1. 消除重复（generate_selling_points 在 contentAgent/detailAgent 各一份 → 统一）
 *   2. 可单独测试（每个工具是纯函数，独立于 Agent）
 *   3. 可组合复用（Agent 自由组合工具，不绑定某个文件）
 */

// ========== AI Gateway 辅助 ==========
export { callLlmAndParseJson } from './ai/gateway-llm-call.js';
export { batchImageGen } from './ai/gateway-image-batch.js';

// ========== 业务工具 ==========
export { generateSellingPoints } from './services/copywriting-tools.js';
