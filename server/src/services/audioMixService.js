/**
 * 音频处理服务 — BGM选曲 / 音频混合 / 降噪规整
 *
 * 依赖:
 *   - ffmpeg (可选): 真实音频混合+降噪，未安装时降级为分层描述
 *   - 内置BGM库: 按情绪/行业分类的免版权曲目
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import logger from '../utils/logger.js';

const execFileP = promisify(execFile);

// ==================== BGM 曲库 ====================

const BGM_LIBRARY = {
  corporate: [
    { id: 'bgm_corp_01', name: 'Inspire Innovation', url: 'https://cdn.pixabay.com/audio/2023/05/09/audio_c8b8d1c0f0.mp3', bpm: 120, mood: 'professional', duration: 120 },
    { id: 'bgm_corp_02', name: 'Ambient Corporate', url: 'https://cdn.pixabay.com/audio/2023/06/15/audio_d1e2a3f4b5.mp3', bpm: 95, mood: 'calm', duration: 180 },
  ],
  energetic: [
    { id: 'bgm_energy_01', name: 'Upbeat Marketing', url: 'https://cdn.pixabay.com/audio/2023/07/22/audio_f6a7b8c9d0.mp3', bpm: 130, mood: 'exciting', duration: 90 },
    { id: 'bgm_energy_02', name: 'Summer Vibes', url: 'https://cdn.pixabay.com/audio/2023/08/10/audio_e5d4c3b2a1.mp3', bpm: 128, mood: 'happy', duration: 100 },
  ],
  elegant: [
    { id: 'bgm_elegant_01', name: 'Luxury Lifestyle', url: 'https://cdn.pixabay.com/audio/2023/09/05/audio_a1b2c3d4e5.mp3', bpm: 85, mood: 'elegant', duration: 150 },
    { id: 'bgm_elegant_02', name: 'Classic Piano', url: 'https://cdn.pixabay.com/audio/2023/10/18/audio_f9e8d7c6b5.mp3', bpm: 72, mood: 'gentle', duration: 200 },
  ],
  tech: [
    { id: 'bgm_tech_01', name: 'Future Tech', url: 'https://cdn.pixabay.com/audio/2023/11/30/audio_a4b5c6d7e8.mp3', bpm: 110, mood: 'modern', duration: 100 },
    { id: 'bgm_tech_02', name: 'Digital Pulse', url: 'https://cdn.pixabay.com/audio/2024/01/15/audio_f9g8h7i6j5.mp3', bpm: 105, mood: 'minimalist', duration: 130 },
  ],
  natural: [
    { id: 'bgm_nature_01', name: 'Organic Flow', url: 'https://cdn.pixabay.com/audio/2024/02/20/audio_k1l2m3n4o5.mp3', bpm: 90, mood: 'warm', duration: 160 },
    { id: 'bgm_nature_02', name: 'Gentle Morning', url: 'https://cdn.pixabay.com/audio/2024/03/08/audio_p6q7r8s9t0.mp3', bpm: 78, mood: 'peaceful', duration: 180 },
  ],
};

const INDUSTRY_BGM_MAP = {
  clothing:  ['elegant', 'energetic'],
  beauty:    ['elegant', 'natural'],
  '3c_digital': ['tech', 'energetic'],
  food:      ['natural', 'energetic'],
  home:      ['natural', 'elegant'],
};

function _pickBgm(industry, mood) {
  const categories = industry ? (INDUSTRY_BGM_MAP[industry] || ['corporate']) : ['corporate'];
  const pool = [];
  for (const cat of categories) {
    if (BGM_LIBRARY[cat]) pool.push(...BGM_LIBRARY[cat]);
  }
  if (mood) {
    const moodMatches = pool.filter(t => t.mood === mood);
    if (moodMatches.length) pool.length = 0; pool.push(...moodMatches);
  }
  return pool[Math.floor(Math.random() * pool.length)] || BGM_LIBRARY.corporate[0];
}

// ==================== ffmpeg 检测 ====================

let _ffmpegAvailable = null;
async function _hasFfmpeg() {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    await execFileP('ffmpeg', ['-version'], { timeout: 5000 });
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

// ==================== BGM 选曲 ====================

/**
 * 为工作流选择BGM
 * @returns {{ bgmUrl, bgmName, bpm, mood, volume, fadeIn, fadeOut, mixInstructions }}
 */
export async function selectBgm(ctx = {}) {
  const industry = ctx.industry || '';
  const mood = ctx.mood || ctx.style || '';
  const bgm = _pickBgm(industry, mood);

  const result = {
    bgmUrl: bgm.url,
    bgmName: bgm.name,
    bpm: bgm.bpm,
    mood: bgm.mood,
    volume: 0.3,
    fadeIn: 1.5,
    fadeOut: 2.0,
    mixInstructions: `BGM "${bgm.name}" (${bgm.bpm}BPM, ${bgm.mood}) at 30% volume with 1.5s fade-in, 2s fade-out`,
  };

  logger.info('[AudioMix] BGM selected', { bgm: bgm.name, industry, mood });
  return result;
}

// ==================== 音频混合 (voice + BGM) ====================

/**
 * 混合配音+BGM → 最终音频
 *
 * @param {string} voiceUrl  配音文件URL
 * @param {object} bgmInfo   selectBgm() 返回值
 * @param {object} opts      { outputDir, voiceVolume, bgmVolume }
 * @returns {{ mixedUrl, method: 'ffmpeg'|'layered', layers?, mixParams? }}
 */
export async function mixAudio(voiceUrl, bgmInfo, opts = {}) {
  if (!voiceUrl) {
    logger.warn('[AudioMix] No voice URL, skipping mix');
    return { mixedUrl: null, method: 'none', reason: 'no voice input' };
  }

  const voiceVol = opts.voiceVolume || 0.85;
  const bgmVol = opts.bgmVolume || 0.25;
  const bgmUrl = bgmInfo?.bgmUrl;

  if (!bgmUrl) {
    return {
      mixedUrl: voiceUrl,
      method: 'pass_through',
      reason: 'no BGM selected',
    };
  }

  const hasFfmpeg = await _hasFfmpeg();

  if (hasFfmpeg) {
    try {
      const outputDir = opts.outputDir || os.tmpdir();
      const outFile = path.join(outputDir, `mixed_${Date.now()}.mp3`);

      await execFileP('ffmpeg', [
        '-i', voiceUrl,
        '-i', bgmUrl,
        '-filter_complex',
        `[0:a]volume=${voiceVol}[v];[1:a]volume=${bgmVol},afade=t=in:d=${bgmInfo.fadeIn || 1.5},afade=t=out:st=${(bgmInfo.duration || 30) - (bgmInfo.fadeOut || 2)}:d=${bgmInfo.fadeOut || 2}[b];[v][b]amix=inputs=2:duration=first:dropout_transition=2`,
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        outFile,
      ], { timeout: 60000 });

      logger.info('[AudioMix] ffmpeg mix complete', { outFile });
      return { mixedUrl: outFile, method: 'ffmpeg', mixParams: { voiceVol, bgmVol } };
    } catch (err) {
      logger.warn('[AudioMix] ffmpeg mix failed, fallback to layered', err.message);
    }
  }

  // 无ffmpeg → 返回分层描述(前端可自行叠加)
  return {
    mixedUrl: voiceUrl,
    method: 'layered',
    layers: {
      voice: { url: voiceUrl, volume: voiceVol },
      bgm: { url: bgmUrl, volume: bgmVol, fadeIn: bgmInfo.fadeIn || 1.5, fadeOut: bgmInfo.fadeOut || 2 },
    },
    mixParams: { voiceVol, bgmVol },
    instructions: bgmInfo?.mixInstructions || '',
  };
}

// ==================== 降噪规整 ====================

/**
 * 音频降噪+响度规整
 *
 * @param {string} audioUrl  待处理音频URL
 * @param {object} opts      { outputDir, normalizeDb, noiseReduction }
 * @returns {{ denoisedUrl, method, normalized, noiseProfile? }}
 */
export async function reduceNoise(audioUrl, opts = {}) {
  if (!audioUrl) {
    return { denoisedUrl: null, normalized: false, reason: 'no audio input' };
  }

  const hasFfmpeg = await _hasFfmpeg();

  if (hasFfmpeg) {
    try {
      const outputDir = opts.outputDir || os.tmpdir();
      const outFile = path.join(outputDir, `denoised_${Date.now()}.mp3`);

      await execFileP('ffmpeg', [
        '-i', audioUrl,
        '-af', 'anlmdn=s=0.0003:p=0.0003:r=0.002,mcompand="0.005,0.1 -60/-60|-40/-30|-20/-20|0/-12:6:0:-12:0.2",loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        outFile,
      ], { timeout: 60000 });

      logger.info('[AudioMix] Noise reduction complete', { outFile });
      return { denoisedUrl: outFile, method: 'ffmpeg', normalized: true };
    } catch (err) {
      logger.warn('[AudioMix] ffmpeg denoise failed', err.message);
    }
  }

  // 无ffmpeg → 返回基本信息(建议安装ffmpeg获得最佳效果)
  return {
    denoisedUrl: audioUrl,
    method: 'pass_through',
    normalized: false,
    recommendation: 'Install ffmpeg for real noise reduction via anlmdn+loudnorm filters',
  };
}

export default { selectBgm, mixAudio, reduceNoise };
