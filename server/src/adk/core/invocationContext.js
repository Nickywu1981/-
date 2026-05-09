/**
 * ADK 核心原语 — InvocationContext（调用上下文）
 * 单次 run_async 的全量运行时信息
 */
export class InvocationContext {
  /** @param {{ session: import('./session.js').Session, agentName?: string, invocationId?: string, branch?: string }} */
  constructor(opts) {
    this.session = opts.session
    this.agentName = opts.agentName ?? 'root'
    this.invocationId = opts.invocationId ?? `inv_${Date.now()}`
    this.branch = opts.branch ?? null

    // 服务注入（由 Runner 填充）
    this.services = {}
    this.model = null       // 当前使用的模型名
    this.config = {}        // 运行时配置
  }

  /** 便捷写入 session state */
  setState(key, value) {
    this.session.state.set(key, value)
  }

  getState(key) {
    return this.session.state.get(key)
  }
}
