/**
 * 工作记忆缓冲区 (Working Memory Buffer)
 *
 * 短时记忆暂存区：当前任务上下文、中间结果、已选模型等
 * 30min TTL，超容量时按优先级淘汰（淘汰前写入 LTM）
 * 工作流完成时 flush 到长期记忆
 */
import * as ltm from './longTermMemoryService.js';
import logger from '../utils/logger.js';

const DEFAULT_TTL_MS = 1_800_000; // 30 分钟
const MAX_CAPACITY = 50;

export class WorkingMemory {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this._store = new Map();        // key → { value, priority, ts }
    this._ttl = ttlMs;
    this._capacity = MAX_CAPACITY;
    this._createdAt = Date.now();
  }

  /**
   * 写入工作记忆
   * @param {string} key
   * @param {*} value
   * @param {number} [priority=0] 优先级，越大越不易淘汰
   */
  set(key, value, priority = 0) {
    if (this._store.size >= this._capacity && !this._store.has(key)) {
      this._evictOne();
    }
    this._store.set(key, { value, priority, ts: Date.now() });
  }

  /**
   * 读取工作记忆
   * @param {string} key
   * @returns {*|null} 过期返回 null
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this._ttl) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /** 检查 key 是否存在且未过期 */
  has(key) {
    return this.get(key) !== null;
  }

  /** 删除指定 key */
  delete(key) {
    return this._store.delete(key);
  }

  /** 获取所有有效 key */
  keys() {
    this.evict();
    return [...this._store.keys()];
  }

  /** 获取所有有效条目 { key, value, priority } */
  entries() {
    this.evict();
    return [...this._store.entries()].map(([k, v]) => ({ key: k, value: v.value, priority: v.priority }));
  }

  /** 清理过期条目 */
  evict() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now - entry.ts > this._ttl) {
        this._store.delete(key);
      }
    }
  }

  /**
   * 将缓冲区全部内容写入 LTM
   * @param {string} userId
   */
  async flushToLTM(userId) {
    this.evict();
    const entries = this.entries();
    if (entries.length === 0) return 0;

    const tasks = entries.map(({ key, value, priority }) => {
      const content = typeof value === 'string' ? value : JSON.stringify(value);
      return ltm.store({
        namespace: 'user',
        subjectId: String(userId),
        memoryKey: `working_${key}_${Date.now()}`,
        content: `[工作记忆] ${key}: ${content}`,
        memoryType: 'working',
        importance: Math.min(0.8, 0.3 + priority * 0.1),
        source: 'working_memory',
        tags: ['working', 'short_term'],
        metadata: { workingKey: key, priority, sessionDuration: Date.now() - this._createdAt },
      }).catch(err => {
        logger.warn('[WorkingMemory] flush entry failed', { key, error: err.message });
        return null;
      });
    });

    const results = await Promise.allSettled(tasks);
    const count = results.filter(r => r.status === 'fulfilled' && r.value).length;
    this._store.clear();
    logger.info('[WorkingMemory] Flushed to LTM', { userId, entries: entries.length, stored: count });
    return count;
  }

  /** 淘汰最低优先级条目（写入 LTM 后删除） */
  _evictOne() {
    let lowest = null;
    let lowestKey = null;
    for (const [key, entry] of this._store) {
      if (!lowest || entry.priority < lowest.priority) {
        lowest = entry;
        lowestKey = key;
      }
    }
    if (lowestKey) {
      this._store.delete(lowestKey);
    }
  }
}

export default WorkingMemory;
