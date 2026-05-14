import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/job-queue.service.js', () => ({
  submitJob: vi.fn().mockResolvedValue({ job_id: 'job-001', status: 'queued' }),
}));
vi.mock('../../services/moderation.service.js', () => ({
  moderateText: vi.fn().mockResolvedValue({ action: 'pass' }),
}));

import {
  translateVoice,
  translateSubtitles,
  translateFace,
  SUPPORTED_LANGS,
} from '../../services/video-translate.service.js';
import { submitJob } from '../../services/job-queue.service.js';
import { moderateText } from '../../services/moderation.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  submitJob.mockResolvedValue({ job_id: 'job-001', status: 'queued' });
  moderateText.mockResolvedValue({ action: 'pass' });
});

describe('video-translate service', () => {
  describe('translateVoice', () => {
    it('should submit voice translate job with defaults', async () => {
      const result = await translateVoice('user-1', {
        videoUrl: 'https://cdn.example.com/video.mp4',
      });
      expect(result.job_id).toBe('job-001');
      expect(submitJob).toHaveBeenCalledWith('user-1', 'video_voice_translate', expect.objectContaining({
        video_url: 'https://cdn.example.com/video.mp4',
        source_lang: 'zh',
        target_lang: 'en',
        voice_type: 'natural',
      }), { priority: 5 });
    });

    it('should pass custom language pair', async () => {
      await translateVoice('user-1', { videoUrl: 'v.mp4', sourceLang: 'ja', targetLang: 'ko', voiceType: 'deep' });
      expect(submitJob).toHaveBeenCalledWith('user-1', 'video_voice_translate', expect.objectContaining({
        source_lang: 'ja', target_lang: 'ko', voice_type: 'deep',
      }), { priority: 5 });
    });

    it('should block on moderation reject', async () => {
      moderateText.mockResolvedValueOnce({ action: 'block' });
      await expect(translateVoice('user-1', { videoUrl: 'v.mp4' })).rejects.toThrow();
    });
  });

  describe('translateSubtitles', () => {
    it('should submit subtitle translate job', async () => {
      const result = await translateSubtitles('user-1', {
        videoUrl: 'v.mp4', sourceLang: 'zh', targetLang: 'ja', subtitleStyle: 'karaoke',
      });
      expect(result.job_id).toBe('job-001');
      expect(submitJob).toHaveBeenCalledWith('user-1', 'video_subtitle_translate', expect.objectContaining({
        subtitle_style: 'karaoke',
      }), { priority: 5 });
    });
  });

  describe('translateFace', () => {
    it('should submit face translate job', async () => {
      const result = await translateFace('user-1', { videoUrl: 'v.mp4', avatarStyle: 'anime' });
      expect(result.job_id).toBe('job-001');
      expect(submitJob).toHaveBeenCalledWith('user-1', 'video_face_translate', expect.objectContaining({
        avatar_style: 'anime',
      }), { priority: 5 });
    });

    it('should block on moderation reject', async () => {
      moderateText.mockResolvedValueOnce({ action: 'block' });
      await expect(translateFace('user-1', { videoUrl: 'v.mp4' })).rejects.toThrow();
    });
  });

  describe('SUPPORTED_LANGS', () => {
    it('should have 12 languages', () => {
      expect(SUPPORTED_LANGS).toHaveLength(12);
    });
    it('should include major languages', () => {
      const codes = SUPPORTED_LANGS.map(l => l.code);
      expect(codes).toContain('zh');
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
      expect(codes).toContain('ar');
    });
  });
});
