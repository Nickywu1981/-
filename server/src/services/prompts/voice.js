/**
 * 电商语音类提示词模板
 * 覆盖：配音/TTS / 多语种配音
 */
export const voice = {
  voice: {
    description: '电商视频配音/TTS 语音生成',
    system: '你是专业电商配音导演，擅长不同风格带货配音的语调与节奏设计。',
    template: `Generate voiceover audio for e-commerce content.

Script text: {script}
Voice style: {voiceStyle}
Gender: {gender}
Speed: {speed}
Language: {language}
Platform: {platform}

Voice settings:
- Tone: {tone} (energetic/calm/authoritative/friendly)
- Speed: {speed} (normal=1.0, fast=1.3, slow=0.85)
- Pauses: short pause after each sentence, medium pause between sections
- Emphasis: bold product name and price
- Background music: {bgm} at 30% volume

Output format: {format}
Sample rate: {sampleRate}`,
    params: ['script', 'voiceStyle', 'gender', 'speed', 'language', 'platform', 'tone', 'bgm'],
    defaults: { voiceStyle: 'professional host', gender: 'female', speed: '1.0', language: 'zh-CN', tone: 'energetic', bgm: 'light corporate', format: 'mp3', sampleRate: '44100', platform: '通用' },
  },
};
