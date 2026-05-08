import { describe, it, expect } from 'vitest';

// ============================================================
// 从 diyService.js 提取的纯函数
// ============================================================

const STATE_MACHINE = {
  0: { allow: [1, 3], msg: { 1: '发布成功', 3: '已移入回收站' } },
  1: { allow: [2], msg: { 2: '已下线' } },
  2: { allow: [0, 1, 3], msg: { 0: '已退回草稿', 1: '重新发布成功', 3: '已移入回收站' } },
  3: { allow: [0], msg: { 0: '已恢复至草稿' } },
};

function checkStateTransition(currentStatus, targetStatus) {
  const rule = STATE_MACHINE[currentStatus];
  if (!rule || !rule.allow.includes(targetStatus)) {
    const statusNames = { 0: '草稿', 1: '已发布', 2: '已下线', 3: '回收站' };
    throw Object.assign(
      new Error(`页面状态为「${statusNames[currentStatus] || currentStatus}」，不允许此操作`),
      { statusCode: 400 },
    );
  }
  return rule.msg[targetStatus];
}

function validateBeforePublish(page) {
  const issues = [];
  const mobileConfig = page.mobile_config || {};
  const pcConfig = page.pc_config || {};
  const sections = mobileConfig.sections || [];
  const pcSections = pcConfig.sections || [];

  if (!page.title || !page.title.trim()) issues.push('页面标题不能为空');
  if (sections.length === 0 && pcSections.length === 0) issues.push('页面至少需要添加一个组件区块');

  for (const s of sections) {
    if (s.props?.images && s.props.images.some(img => !img)) issues.push(`"${s.type}"组件存在空图片链接`);
    if (s.props?.bgImage && !s.props.bgImage.trim()) issues.push(`"${s.type}"组件背景图为空`);
  }

  for (const s of sections) {
    if (s.type === 'ctaButton' && (!s.props?.text || !s.props.text.trim())) issues.push('CTA按钮文案不能为空');
    if (s.type === 'form' && (!s.props?.submitText || !s.props.submitText.trim())) issues.push('表单提交按钮文案不能为空');
  }

  for (const s of sections) {
    if (s.type === 'form' && (!s.props?.fields || s.props.fields.length === 0)) issues.push('表单组件至少需要一个字段');
  }

  for (const s of sections) {
    if (s.type === 'countdownTimer' && !s.props?.endTime) issues.push('倒计时组件需设置结束时间');
  }

  return issues;
}

// 辅助：创建有效页面
function page(overrides = {}) {
  return {
    title: '测试页面',
    mobile_config: { sections: [] },
    pc_config: { sections: [] },
    ...overrides,
  };
}

// ============================================================
// STATE_MACHINE — 状态机定义
// ============================================================
describe('STATE_MACHINE', () => {
  it('草稿(0) 可发布和移入回收站', () => {
    expect(STATE_MACHINE[0].allow).toEqual([1, 3]);
    expect(STATE_MACHINE[0].msg[1]).toBe('发布成功');
    expect(STATE_MACHINE[0].msg[3]).toBe('已移入回收站');
  });

  it('已发布(1) 只可下线', () => {
    expect(STATE_MACHINE[1].allow).toEqual([2]);
    expect(STATE_MACHINE[1].msg[2]).toBe('已下线');
  });

  it('已下线(2) 可退回草稿/重新发布/移入回收站', () => {
    expect(STATE_MACHINE[2].allow).toEqual([0, 1, 3]);
    expect(STATE_MACHINE[2].msg[0]).toBe('已退回草稿');
    expect(STATE_MACHINE[2].msg[1]).toBe('重新发布成功');
    expect(STATE_MACHINE[2].msg[3]).toBe('已移入回收站');
  });

  it('回收站(3) 只可恢复至草稿', () => {
    expect(STATE_MACHINE[3].allow).toEqual([0]);
    expect(STATE_MACHINE[3].msg[0]).toBe('已恢复至草稿');
  });

  it('状态值就是数字 0/1/2/3 非字符串', () => {
    const states = Object.keys(STATE_MACHINE).map(Number);
    expect(states).toEqual([0, 1, 2, 3]);
  });
});

// ============================================================
// checkStateTransition — 状态流转校验
// ============================================================
describe('checkStateTransition', () => {
  it('草稿→发布成功', () => {
    expect(checkStateTransition(0, 1)).toBe('发布成功');
  });

  it('草稿→移入回收站成功', () => {
    expect(checkStateTransition(0, 3)).toBe('已移入回收站');
  });

  it('草稿→下线 不允许（产生异常）', () => {
    expect(() => checkStateTransition(0, 2)).toThrow('「草稿」');
    expect(() => checkStateTransition(0, 2)).toThrow('不允许此操作');
  });

  it('已发布→下线 允许', () => {
    expect(checkStateTransition(1, 2)).toBe('已下线');
  });

  it('已发布→回收站 不允许', () => {
    expect(() => checkStateTransition(1, 3)).toThrow('「已发布」');
  });

  it('已下线→重新发布/退回草稿/回收站 均允许', () => {
    expect(checkStateTransition(2, 1)).toBe('重新发布成功');
    expect(checkStateTransition(2, 0)).toBe('已退回草稿');
    expect(checkStateTransition(2, 3)).toBe('已移入回收站');
  });

  it('回收站→恢复至草稿 允许', () => {
    expect(checkStateTransition(3, 0)).toBe('已恢复至草稿');
  });

  it('回收站→发布 不允许（不可跨状态）', () => {
    expect(() => checkStateTransition(3, 1)).toThrow('不允许此操作');
  });

  it('回收站→下线 不允许', () => {
    expect(() => checkStateTransition(3, 2)).toThrow('不允许此操作');
  });

  it('非法当前状态抛出异常', () => {
    expect(() => checkStateTransition(99, 0)).toThrow('不允许此操作');
  });

  it('异常附带 statusCode: 400', () => {
    try { checkStateTransition(1, 0); } catch (e) {
      expect(e.statusCode).toBe(400);
    }
  });
});

// ============================================================
// validateBeforePublish — 发布前校验
// ============================================================
describe('validateBeforePublish', () => {
  it('有效页面无问题', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'banner', props: {} }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  it('标题为空报错', () => {
    const issues = validateBeforePublish(page({ title: '' }));
    expect(issues).toContain('页面标题不能为空');
  });

  it('标题仅空白报错', () => {
    const issues = validateBeforePublish(page({ title: '   ' }));
    expect(issues).toContain('页面标题不能为空');
  });

  it('双端都没有组件区块报错', () => {
    const p = page({ mobile_config: { sections: [] }, pc_config: { sections: [] } });
    expect(validateBeforePublish(p)).toContain('页面至少需要添加一个组件区块');
  });

  it('PC 端有内容移动端无视为有内容', () => {
    const p = page({
      mobile_config: { sections: [] },
      pc_config: { sections: [{ type: 'banner', props: {} }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  it('移动端有内容 PC 端无视为有内容', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'text', props: {} }] },
      pc_config: {},
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  // —— 图片链接 ——
  it('空图片链接报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'gallery', props: { images: ['https://ok.jpg', ''] } }] },
    });
    const issues = validateBeforePublish(p);
    expect(issues.some(i => i.includes('空图片链接'))).toBe(true);
  });

  it('全部图片链接有效不报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'gallery', props: { images: ['https://a.jpg', 'https://b.jpg'] } }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  it('空背景图报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'hero', props: { bgImage: '   ' } }] },
    });
    const issues = validateBeforePublish(p);
    expect(issues.some(i => i.includes('背景图为空'))).toBe(true);
  });

  it('有效背景图不报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'hero', props: { bgImage: 'https://bg.jpg' } }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  // —— CTA 按钮 ——
  it('CTA 按钮文案为空报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'ctaButton', props: { text: '' } }] },
    });
    expect(validateBeforePublish(p)).toContain('CTA按钮文案不能为空');
  });

  it('CTA 按钮无 props 报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'ctaButton' }] },
    });
    expect(validateBeforePublish(p)).toContain('CTA按钮文案不能为空');
  });

  it('CTA 按钮有效文案不报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'ctaButton', props: { text: '立即购买' } }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  // —— 表单 ——
  it('表单提交按钮文案为空报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'form', props: { submitText: '  ', fields: [{ name: 'email' }] } }] },
    });
    expect(validateBeforePublish(p)).toContain('表单提交按钮文案不能为空');
  });

  it('表单无字段报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'form', props: { submitText: '提交', fields: [] } }] },
    });
    expect(validateBeforePublish(p)).toContain('表单组件至少需要一个字段');
  });

  it('表单缺少 fields 属性报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'form', props: { submitText: '提交' } }] },
    });
    expect(validateBeforePublish(p)).toContain('表单组件至少需要一个字段');
  });

  it('有效表单不报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'form', props: { submitText: '提交', fields: [{ name: 'phone' }] } }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  // —— 倒计时 ——
  it('倒计时无结束时间报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'countdownTimer', props: {} }] },
    });
    expect(validateBeforePublish(p)).toContain('倒计时组件需设置结束时间');
  });

  it('倒计时有结束时间不报错', () => {
    const p = page({
      mobile_config: { sections: [{ type: 'countdownTimer', props: { endTime: '2026-12-31' } }] },
    });
    expect(validateBeforePublish(p)).toEqual([]);
  });

  // —— 多问题聚合 ——
  it('多个问题同时返回', () => {
    const p = page({
      title: '',
      mobile_config: { sections: [
        { type: 'ctaButton', props: { text: '' } },
        { type: 'form', props: { fields: [] } },
      ] },
    });
    const issues = validateBeforePublish(p);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('缺少 mobile_config 触发空区块报错', () => {
    const issues = validateBeforePublish({ title: 'OK' });
    expect(issues).toEqual(['页面至少需要添加一个组件区块']);
  });
});

