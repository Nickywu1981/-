import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: {
    searchFAQ: vi.fn(), reviewContent: vi.fn(), queryDataAssistant: vi.fn(),
  },
}));

vi.mock('../../services/aiAssistantService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d) => ({ code: 200, data: d }) }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as ctrl from '../../controller/aiAssistantController.js';

describe('aiAssistantController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('askFAQ returns empty hint when no question', async () => {
    const r = await ctrl.askFAQ({ body: { question: '' } });
    expect(r.data.results).toEqual([]);
    expect(r.data.hint).toBeDefined();
  });

  it('askFAQ searches and returns results', async () => {
    mockSvc.searchFAQ.mockReturnValue([{ question: 'Q', answer: 'A' }]);
    const r = await ctrl.askFAQ({ body: { question: '如何充值' } });
    expect(r.data.results).toHaveLength(1);
    expect(r.data.total).toBe(1);
  });

  it('review returns pass for empty text', async () => {
    const r = await ctrl.review({ body: { text: '' } });
    expect(r.data.pass).toBe(true);
    expect(r.data.issues).toEqual([]);
  });

  it('review checks content', async () => {
    mockSvc.reviewContent.mockReturnValue({ pass: false, issues: [{ level: 'block', reason: '违禁词' }], score: 75 });
    const r = await ctrl.review({ body: { text: '包含违法内容' } });
    expect(r.data.pass).toBe(false);
    expect(r.data.issues).toHaveLength(1);
  });

  it('dataQuery returns hint when no question', async () => {
    const r = await ctrl.dataQuery({ body: { question: '' } });
    expect(r.data.answer).toBeDefined();
  });

  it('dataQuery returns analysis', async () => {
    mockSvc.queryDataAssistant.mockReturnValue({ answer: '统计数据', data: { total: 100 } });
    const r = await ctrl.dataQuery({ body: { question: '用户数量' } });
    expect(r.data.answer).toBe('统计数据');
  });
});
