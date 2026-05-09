/**
 * Edge TTS + Voice Clone 适配器 (Simulated)
 * 真实 API 接入：替换 infer() 中的 fetch 调用
 *   - Edge TTS: Microsoft Edge Read Aloud API (免费)
 *   - Voice Clone: ElevenLabs Voice Clone API
 */
import { registerModel } from '../aiEngine.js';
import logger from '../../utils/logger.js';

const EDGE_TTS_VOICES = {
  'sweet-female': 'zh-CN-XiaoxiaoNeural',
  'gentle-male': 'zh-CN-YunxiNeural',
  'professional-female': 'zh-CN-XiaohanNeural',
  'news-male': 'zh-CN-YunjianNeural',
  'story-female': 'zh-CN-XiaomoNeural',
  'cute-female': 'zh-CN-XiaoshuangNeural',
};

export async function registerEdgeTTS() {
  registerModel({
    id: 'edge-tts',
    type: 'audio',
    category: 'audio',
    name: 'Microsoft Edge TTS',
    provider: 'Microsoft',
    async health() {
      return { status: 'ok', model: 'edge-tts', simulated: true };
    },
    async infer(input) {
      const text = input.text || input.prompt || '';
      const voiceType = input.voiceType || input.voice || 'sweet-female';
      const speed = input.speed || 1.0;
      const charCount = text.length;
      const duration = Math.max(1, Math.round(charCount / (4 * speed)));
      const voiceName = EDGE_TTS_VOICES[voiceType] || EDGE_TTS_VOICES['sweet-female'];

      logger.info(`[EdgeTTS] 合成语音: ${voiceType}(${voiceName}), ${charCount}字, ~${duration}s`);

      return {
        output: {
          audioUrl: `/api/audio/tts_${Date.now()}.mp3`,
          duration,
          size: `${Math.round(duration * 16)} KB`,
          format: 'mp3',
          voiceType,
          voiceName,
          textPreview: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
        },
        metadata: { model: 'edge-tts', simulated: true, voiceName },
      };
    },
  });

  // Voice Clone (simulated)
  registerModel({
    id: 'elevenlabs-voice-clone',
    type: 'audio',
    category: 'audio',
    name: 'ElevenLabs Voice Clone',
    provider: 'ElevenLabs',
    async health() {
      return { status: 'ok', model: 'elevenlabs-voice-clone', simulated: true };
    },
    async infer(input) {
      const text = input.text || '';
      const audioSampleUrl = input.audioSampleUrl || '';
      const charCount = text.length;
      const duration = Math.max(2, Math.round(charCount / 4));

      logger.info(`[VoiceClone] 克隆声音: sample=${audioSampleUrl?.slice(-20)}, text=${charCount}字`);

      return {
        output: {
          audioUrl: `/api/audio/clone_${Date.now()}.mp3`,
          duration,
          size: `${Math.round(duration * 16)} KB`,
          format: 'mp3',
          similarity: '92%',
          sampleAnalyzed: !!audioSampleUrl,
        },
        metadata: { model: 'elevenlabs-voice-clone', simulated: true },
      };
    },
  });

  logger.info('[EdgeTTS] 音频模型已注册: edge-tts + elevenlabs-voice-clone');
}
