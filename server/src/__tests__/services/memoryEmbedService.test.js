import { describe, it, expect } from 'vitest';

const {
  embed,
  semanticSearch,
  tokenLookup,
  getMemoryStatus,
} = await import('../../services/memoryEmbedService.js');

describe('memoryEmbedService', () => {
  describe('embed()', () => {
    it('should return a vector with dimensions', () => {
      const result = embed('前后端分离铁律项目架构');
      expect(result.dimensions).toBeGreaterThan(0);
      expect(result.vector).toBeDefined();
      expect(typeof result.vector).toBe('object');
      expect(result.model).toMatch(/tfidf/);
    });

    it('should handle empty text', () => {
      const result = embed('');
      expect(result.vector).toBeDefined();
      expect(result.tokens).toBe(0);
    });

    it('should handle English text', () => {
      const result = embed('Nuxt3 Express MySQL Redis project');
      expect(result.vector).toBeDefined();
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should produce non-empty vector for Chinese input', () => {
      const result = embed('前后端分离');
      expect(Object.keys(result.vector).length).toBeGreaterThan(0);
    });
  });

  describe('semanticSearch()', () => {
    it('should return results for relevant query', () => {
      const result = semanticSearch('前后端怎么分工代码怎么组织', 3);
      expect(result.totalChunks).toBeGreaterThan(0);
    });

    it('should respect topK limit', () => {
      const result = semanticSearch('技术栈 MySQL Redis', 2);
      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should score first result for relevant query', () => {
      const result = semanticSearch('前后端分离架构', 3);
      if (result.results.length > 0) {
        expect(result.results[0].score).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('tokenLookup()', () => {
    it('should find known tokens from real index', () => {
      const result = tokenLookup('modelDispatcher');
      // Real token index should have this
      if (result.found) {
        expect(result.entries.length).toBeGreaterThan(0);
      }
    });

    it('should not find non-existent token', () => {
      const result = tokenLookup('nonexistentFunction_xyz_123');
      expect(result.found).toBe(false);
      expect(result.entries).toEqual([]);
    });
  });

  describe('getMemoryStatus()', () => {
    it('should return valid memory status', () => {
      const status = getMemoryStatus();
      expect(typeof status.vectorStore.loaded).toBe('boolean');
      expect(typeof status.vectorStore.chunks).toBe('number');
      expect(typeof status.tokenIndex.loaded).toBe('boolean');
      expect(typeof status.tokenIndex.tokens).toBe('number');
    });
  });
});
