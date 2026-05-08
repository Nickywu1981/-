/**
 * 视频生成提示词模板
 * 用途：图生视频 / 多图合成 / 视频编辑 / 数字人
 */

export const videoGen = {
  imgToVideo: {
    description: '单图生成短视频',
    template: `Generate a {duration}-second video from this product image.
Motion: {motion}
Camera: {camera}
Style: {style}
Resolution: {resolution}
Add smooth transitions and cinematic feel. Keep the product as the main focus.`,
    params: ['duration', 'motion', 'camera', 'style', 'resolution'],
    defaults: { duration: 10, motion: 'gentle rotation', camera: 'orbit', style: 'cinematic', resolution: '1080p' },
  },

  multiImgSynthesis: {
    description: '多图合成视频',
    template: `Create a product showcase video from {count} images.
Transition style: {transition}
Music mood: {mood}
Show each image for {durationPerImage}s
Add {overlayText} overlay text`,
    params: ['count', 'transition', 'mood', 'durationPerImage', 'overlayText'],
    defaults: { transition: 'smooth fade', mood: 'upbeat', durationPerImage: 3 },
  },
};

export const advancedVideo = {
  storyboard: {
    description: 'AI 智能分镜生成',
    template: `Create a {shotCount}-shot storyboard for a {duration}-second product video.
Product: {productName}
Platform: {platform}
Style: {style}

For each shot, describe:
1. Shot type (close-up/medium/wide)
2. Camera movement
3. Visual content
4. Duration
5. Transition to next shot`,
    params: ['productName', 'platform', 'duration', 'style', 'shotCount'],
    defaults: { duration: 30, style: 'commercial', shotCount: 6, platform: 'douyin' },
  },

  voiceGen: {
    description: 'AI 语音生成',
    template: `Generate {language} voiceover for the following script.
Voice: {voiceType}
Speed: {speed}x
Emotion: {emotion}
Script: {script}`,
    params: ['script', 'language', 'voiceType', 'speed', 'emotion'],
    defaults: { language: 'zh-CN', voiceType: 'female-professional', speed: 1.0, emotion: 'warm' },
  },
};
