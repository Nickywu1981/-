/**
 * ADK 编排器 — SequentialAgent / ParallelAgent / LoopAgent
 * 确定性工作流编排，自身不使用 LLM
 */
import { BaseAgent } from '../core/agent.js'

/** 串行流水线：A → B → C */
export class SequentialAgent extends BaseAgent {
  constructor(opts) {
    super(opts)
  }

  async _runAsyncImpl(ctx) {
    const results = []
    for (const sub of this.subAgents) {
      const r = await sub.runAsync(ctx)
      results.push(r)
    }
    return results
  }
}

/** 并行扇出：A，B，C 同时跑 */
export class ParallelAgent extends BaseAgent {
  constructor(opts) {
    super(opts)
  }

  async _runAsyncImpl(ctx) {
    const results = await Promise.all(
      this.subAgents.map(sub => sub.runAsync(ctx))
    )
    return results
  }
}

/** 循环执行：重复直到条件满足或 maxIterations */
export class LoopAgent extends BaseAgent {
  /**
   * @param {object} opts
   * @param {number} [opts.maxIterations=5] 最大迭代次数
   * @param {Function} [opts.condition] (ctx, iteration, lastResult) => boolean
   */
  constructor(opts) {
    super(opts)
    this.maxIterations = opts.maxIterations || 5
    this.condition = opts.condition || null
  }

  async _runAsyncImpl(ctx) {
    const results = []
    for (let i = 0; i < this.maxIterations; i++) {
      // 每次迭代跑所有 subAgent
      for (const sub of this.subAgents) {
        const r = await sub.runAsync(ctx)
        results.push(r)
      }
      if (this.condition && !(await this.condition(ctx, i, results[results.length - 1]))) {
        break
      }
    }
    return results
  }
}
