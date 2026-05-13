/**
 * 电商视频类提示词模板
 * 覆盖：主图视频 / 投流视频 / 动作迁移 / 视频复刻
 */
export const video = {
  main_video: {
    description: '商品主图视频生成',
    system: '你是资深电商视频导演，擅长商品展示短视频创意与分镜设计。',
    template: `Create a product showcase video script and visual direction.

Product: {productName}
Duration: {duration}s
Platform: {platform}
Style: {style}

Video structure:
- 0-{hookEnd}s: Hook — grab attention immediately
- {hookEnd}-{featureEnd}s: Key feature showcase (3 angles)
- {featureEnd}-{useEnd}s: Usage demonstration
- {useEnd}-{duration}s: CTA + brand closer

Requirements:
- Smooth camera movements
- {platform} aspect ratio
- Background music: {bgm}
- Text overlays at key moments
- Color grading: {colorGrade}
- No abrupt transitions`,
    params: ['productName', 'duration', 'platform', 'style', 'bgm', 'colorGrade'],
    defaults: { duration: 30, platform: 'taobao', style: 'clean product', bgm: 'upbeat light', colorGrade: 'natural bright' },
  },

  ad_video: {
    description: '投流广告短视频（千川/巨量）',
    system: '你是资深信息流广告投放专家，擅长高转化投流素材创作。',
    template: `Create a conversion-optimized ad video for {platform} feed.

Product: {productName}
Ad goal: {adGoal}
Target audience: {audience}
Duration: {duration}s
Budget level: {budget}

Critical requirements:
- First 3 seconds: MUST show product + hook (no logo intro)
- {platform} ad policy compliance
- Text overlay for sound-off viewing
- Split-testing: generate 2 variant hooks
- CTA: clear, urgent, actionable
- BGM: trending, energetic
- Avoid: slow pans, long text, subtle messaging

Hook variants:
A) Problem-solution: "{painPoint}? Try this."
B) Curiosity gap: "You won't believe what {productName} can do."`,
    params: ['productName', 'platform', 'adGoal', 'audience', 'duration', 'budget', 'painPoint'],
    defaults: { platform: 'douyin', adGoal: 'conversion', audience: '25-40 female', duration: 15, budget: 'standard' },
  },

  action_migrate: {
    description: '动作迁移视频（AI驱动）',
    system: '你是AI动作迁移技术专家，负责动作模板匹配与迁移参数配置。',
    template: `Configure AI action migration for e-commerce video.

Product/Subject: {productName}
Source action video: {sourceAction}
Target: {targetDescription}
Action style: {actionStyle}

Requirements:
- Motion smoothness: high
- Background handling: {backgroundMode}
- Output duration: {duration}s
- Resolution: {resolution}
- Frame rate: {fps}fps
- Face/hand detail preservation: on
- Physics consistency check: on`,
    params: ['productName', 'sourceAction', 'targetDescription', 'actionStyle', 'backgroundMode'],
    defaults: { duration: 15, resolution: '1080p', fps: 30, backgroundMode: 'auto-segment', actionStyle: 'natural' },
  },

  video_clone: {
    description: '视频复刻（仿拍/翻拍）',
    system: '你是视频复刻技术专家，负责参考视频分析+复刻参数生成。',
    template: `Analyze and replicate video style for e-commerce.

Reference video characteristics:
- Style: {style}
- Reference URL/description: {reference}

Product to feature: {productName}
Platform target: {platform}

Replication parameters:
1. Shot composition: match reference framing
2. Color grading: replicate reference palette
3. Transition style: match reference rhythm
4. Text overlay: adapt for {productName}
5. BGM: similar genre, different track
6. Duration: {duration}s

Note: Replicate style/technique, NOT content — create original content with same aesthetic.`,
    params: ['productName', 'reference', 'style', 'platform', 'duration'],
    defaults: { duration: 30, platform: 'douyin', style: 'trending' },
  },
};
