import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../services/aiEngine.js', () => ({ infer: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { infer } from '../../services/aiEngine.js';
import { generateVoice, cloneVoice } from '../../controller/v4VoiceController.js';

function mockRes() {
  let sent = false;
  return {
    json(d) { sent = true; return d; },
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    get headersSent() { return sent; },
  };
}

describe('v4VoiceController', () => {
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
  });

  describe('generateVoice', () => {
    it('TTS 调用 aiEngine edge-tts adapter', async () => {
      infer.mockResolvedValue({ url: 'https://cdn.example/audio.mp3' });
      const req = { validated: { text: '你好世界', voice: 'zh-CN-Xiaoxiao', speed: 1.0 } };
      const result = await generateVoice(req, res);
      expect(infer).toHaveBeenCalledWith('edge-tts', {
        text: '你好世界', voiceType: 'zh-CN-Xiaoxiao', speed: 1.0, task: 'tts',
      });
      expect(result.code).toBe(200);
    });

    it('生成失败返回错误响应', async () => {
      infer.mockRejectedValue(new Error('TTS 服务不可用'));
      const result = await generateVoice({ validated: { text: 'test' } }, res);
      expect(result.code).toBe(500);
    });
  });

  describe('cloneVoice', () => {
    it('声音克隆调用 aiEngine elevenlabs adapter', async () => {
      infer.mockResolvedValue({ url: 'https://cdn.example/cloned.mp3' });
      const req = { validated: { sampleUrl: 'https://sample.com/voice.wav', text: '克隆测试' } };
      const result = await cloneVoice(req, res);
      expect(infer).toHaveBeenCalledWith('elevenlabs-voice-clone', {
        audioSampleUrl: 'https://sample.com/voice.wav', text: '克隆测试', task: 'voice_clone',
      });
      expect(result.code).toBe(200);
    });
  });
});
