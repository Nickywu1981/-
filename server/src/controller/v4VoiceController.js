/**
 * Movio AI v4.1 — Voice Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { infer } from '../services/aiEngine.js';

export const generateVoice = wrapController(async (req, res) => {
  const result = await infer('edge-tts', { text: req.validated.text, voiceType: req.validated.voice, speed: req.validated.speed, task: 'tts' });
  return success(res, result, '语音生成成功');
});

export const cloneVoice = wrapController(async (req, res) => {
  const result = await infer('elevenlabs-voice-clone', { audioSampleUrl: req.validated.sampleUrl, text: req.validated.text, task: 'voice_clone' });
  return success(res, result, '声音克隆成功');
});
