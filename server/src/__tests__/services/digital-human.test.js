import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/job-queue.service.js', () => ({
  submitJob: vi.fn().mockResolvedValue({ job_id: 'dh-001', status: 'queued' }),
}));
vi.mock('../../services/moderation.service.js', () => ({
  moderateText: vi.fn().mockResolvedValue({ action: 'pass' }),
}));

import { createDigitalHuman } from '../../services/digital-human.service.js';
import { submitJob } from '../../services/job-queue.service.js';
import { moderateText } from '../../services/moderation.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  submitJob.mockResolvedValue({ job_id: 'dh-001', status: 'queued' });
  moderateText.mockResolvedValue({ action: 'pass' });
});

describe('digital-human service', () => {
  describe('createDigitalHuman', () => {
    it('should throw if neither text nor audioUrl provided', async () => {
      await expect(createDigitalHuman('user-1', {})).rejects.toMatchObject({ status: 4201 });
    });

    it('should submit job with text input', async () => {
      const result = await createDigitalHuman('user-1', {
        text: '欢迎来到我们的电商直播间',
        avatarStyle: 'realistic',
        background: 'studio',
      });
      expect(result.job_id).toBe('dh-001');
      expect(submitJob).toHaveBeenCalledWith('user-1', 'digital_human', expect.objectContaining({
        text: '欢迎来到我们的电商直播间',
        avatar_style: 'realistic',
        background: 'studio',
      }), { priority: 4 });
    });

    it('should submit job with audioUrl input', async () => {
      const result = await createDigitalHuman('user-1', {
        audioUrl: 'https://cdn.example.com/voice.mp3',
      });
      expect(result.job_id).toBe('dh-001');
      expect(submitJob).toHaveBeenCalledWith('user-1', 'digital_human', expect.objectContaining({
        text: undefined,
        audio_url: 'https://cdn.example.com/voice.mp3',
      }), { priority: 4 });
    });

    it('should block on text moderation reject', async () => {
      moderateText.mockResolvedValueOnce({ action: 'block' });
      await expect(createDigitalHuman('user-1', { text: '违规内容' })).rejects.toMatchObject({ status: 4401 });
    });

    it('should skip moderation if no text provided (audio only)', async () => {
      await createDigitalHuman('user-1', { audioUrl: 'https://cdn.example.com/voice.mp3' });
      expect(moderateText).not.toHaveBeenCalled();
    });

    it('should pass avatarStyle through correctly', async () => {
      await createDigitalHuman('user-1', { text: 'hello', avatarStyle: 'anime' });
      expect(submitJob).toHaveBeenCalledWith('user-1', 'digital_human', expect.objectContaining({
        avatar_style: 'anime',
      }), { priority: 4 });
    });
  });
});
