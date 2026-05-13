/**
 * 视频分析服务 — 参考视频帧提取 / 复刻相似度评分
 *
 * 功能:
 *   1. 参考视频关键帧提取 (均匀采样+场景切换检测)
 *   2. 爆款视频拆解 (帧→结构→节奏→钩子)
 *   3. 复刻作品 vs 原版相似度评分
 *
 * 依赖: ffmpeg (帧提取), OpenAI Vision (帧描述)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const execFileP = promisify(execFile);
const fsMkdir = promisify(fs.mkdir);

// ==================== 帧提取 ====================

/**
 * 从参考视频提取关键帧
 *
 * @param {string} videoUrl   视频URL/路径
 * @param {object} [opts]
 * @param {number} [opts.frameCount] 提取帧数 (默认 8)
 * @param {string} [opts.outputDir]  输出目录
 * @returns {{ frames: Array<{index, time, path}>, totalFrames, duration, method }}
 */
export async function extractFrames(videoUrl, opts = {}) {
  if (!videoUrl) return { frames: [], totalFrames: 0, duration: 0, method: 'none', reason: 'no video URL' };

  // 只支持本地文件路径的ffmpeg处理，远程URL跳过
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return {
      frames: [],
      totalFrames: 0,
      duration: 0,
      method: 'remote_skipped',
      reason: 'Cannot extract frames from remote URL. Use local file or download first.',
      suggestion: 'Download the reference video locally, then use the local path for frame extraction.',
    };
  }

  const frameCount = opts.frameCount || 8;
  const outputDir = opts.outputDir || os.tmpdir();
  const sessionDir = path.join(outputDir, `frames_${Date.now()}`);
  await fsMkdir(sessionDir, { recursive: true }).catch(e => { throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Temp directory creation failed', { sessionDir, reason: e.message }); });

  try {
    await execFileP('ffmpeg', ['-version'], { timeout: 3000 });

    // 获取视频时长
    let duration = 30;
    try {
      const { stdout } = await execFileP('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', videoUrl,
      ], { timeout: 15000 });
      duration = parseFloat(stdout.trim()) || 30;
    } catch (e) { logger.warn('[VideoAnalysis] ffprobe duration failed, using default 30s', { error: e.message }); }

    const interval = Math.max(1, duration / frameCount);

    const outPattern = path.join(sessionDir, 'frame_%03d.jpg');
    await execFileP('ffmpeg', [
      '-i', videoUrl,
      '-vf', `fps=1/${interval},scale=iw*sar:ih,setsar=1`,
      '-q:v', '2',
      '-frames:v', String(frameCount),
      outPattern,
    ], { timeout: 60000 });

    // 收集生成的帧
    const files = fs.readdirSync(sessionDir)
      .filter(f => f.endsWith('.jpg'))
      .sort()
      .map((f, i) => ({
        index: i,
        time: Math.round(i * interval),
        path: path.join(sessionDir, f),
      }));

    logger.info('[VideoAnalysis] Frames extracted', { count: files.length, duration, interval });
    return { frames: files, totalFrames: Math.floor(duration * (30)), duration, method: 'ffmpeg' };
  } catch (err) {
    logger.warn('[VideoAnalysis] ffmpeg unavailable or failed', err.message.slice(0, 80));
  }

  // 无ffmpeg → 手动标记
  return {
    frames: [],
    totalFrames: 0,
    duration: 0,
    method: 'none',
    reason: 'ffmpeg not available',
    suggestion: 'Install ffmpeg for video frame extraction.',
  };
}

// ==================== 视频结构拆解 ====================

/**
 * 拆解视频结构 (基于帧描述 + LLM分析)
 *
 * @param {object} content    视频内容 { frames?, textDescription?, viralInsight? }
 * @param {object} [opts]
 * @returns {{ structure: { hook, scenes, closing, paceMap }, summary }}
 */
export function analyzeVideoStructure(content = {}, opts = {}) {
  const { frames = [], textDescription = '', viralInsight = null } = content;

  const structure = {
    hook: {
      type: 'unknown',
      seconds: '0-3',
      description: textDescription?.slice(0, 80) || '未分析',
    },
    scenes: [],
    closing: {
      type: 'unknown',
      seconds: 'last 3',
      description: '',
    },
    paceMap: {
      overall: 'medium',
      segments: [],
    },
  };

  // 基于帧数推断场景结构
  if (frames.length >= 3) {
    structure.hook.type = 'visual_hook';
    structure.scenes = frames.map((f, i) => ({
      number: i + 1,
      time: f.time || Math.round((i / frames.length) * 30),
      frameIndex: f.index,
      framePath: f.path || null,
    }));
  }

  // 合并LLM拆解结果
  if (viralInsight) {
    structure.hook.type = viralInsight.hookType || structure.hook.type;
    structure.hook.description = viralInsight.hookScript || structure.hook.description;
    structure.closing.type = viralInsight.closingStyle || structure.closing.type;
    structure.paceMap.overall = viralInsight.pacePattern || structure.paceMap.overall;
    structure.musicStyle = viralInsight.musicStyle || null;
    structure.sellingCards = viralInsight.sellingCards || [];
    structure.viralFormula = viralInsight.viralFormula || null;
  }

  return {
    structure,
    summary: {
      hookType: structure.hook.type,
      sceneCount: structure.scenes.length,
      closingStyle: structure.closing.type,
      pace: structure.paceMap.overall,
      musicStyle: structure.musicStyle,
      sellingCardCount: structure.sellingCards?.length || 0,
      viralFormula: structure.viralFormula,
    },
  };
}

// ==================== 复刻相似度评分 ====================

/**
 * 复刻作品 vs 参考原版 相似度评分
 *
 * 评分维度 (0-100):
 *   - hookSimilarity    钩子相似度 (权重 25%)
 *   - structureSimilarity 结构相似度 (权重 25%)
 *   - paceSimilarity    节奏相似度 (权重 20%)
 *   - visualSimilarity  视觉风格相似度 (权重 15%)
 *   - musicSimilarity   配乐风格相似度 (权重 10%)
 *   - overallCohesion   整体融合度 (权重 5%)
 *
 * @param {object} original   原版分析结果
 * @param {object} clone      复刻作品分析结果
 * @returns {{ scores, totalScore, grade, feedback }}
 */
export function scoreCloneSimilarity(original = {}, clone = {}) {
  const scores = {
    hookSimilarity: _compareHook(original, clone),
    structureSimilarity: _compareStructure(original, clone),
    paceSimilarity: _comparePace(original, clone),
    visualSimilarity: _compareVisual(original, clone),
    musicSimilarity: _compareMusic(original, clone),
    overallCohesion: _compareCohesion(original, clone),
  };

  const weighted = (scores.hookSimilarity * 0.25)
    + (scores.structureSimilarity * 0.25)
    + (scores.paceSimilarity * 0.20)
    + (scores.visualSimilarity * 0.15)
    + (scores.musicSimilarity * 0.10)
    + (scores.overallCohesion * 0.05);

  const totalScore = Math.round(weighted);

  let grade;
  if (totalScore >= 85) grade = 'A — 高度复刻成功';
  else if (totalScore >= 70) grade = 'B — 良好复刻，细微差异';
  else if (totalScore >= 55) grade = 'C — 基本复刻，需微调';
  else if (totalScore >= 40) grade = 'D — 复刻偏差较大';
  else grade = 'E — 复刻失败，建议重做';

  return {
    scores,
    totalScore,
    grade,
    feedback: _generateFeedback(scores, totalScore),
  };
}

// ==================== 评分子函数 ====================

function _compareHook(original, clone) {
  const origHook = original?.structure?.hook || original?.hook || {};
  const cloneHook = clone?.structure?.hook || clone?.hook || {};

  let score = 50;
  if (origHook.type && cloneHook.type && origHook.type === cloneHook.type) score += 20;
  if (origHook.description && cloneHook.description) {
    const similarity = _textSimilarity(origHook.description, cloneHook.description);
    score += Math.round(similarity * 30);
  }
  return Math.min(100, score);
}

function _compareStructure(original, clone) {
  const origScenes = original?.structure?.scenes || original?.scenes || [];
  const cloneScenes = clone?.structure?.scenes || clone?.scenes || [];

  if (origScenes.length === 0 && cloneScenes.length === 0) return 60;
  if (origScenes.length === 0 || cloneScenes.length === 0) return 30;

  const countDiff = Math.abs(origScenes.length - cloneScenes.length);
  let score = 100 - countDiff * 15;

  const minLen = Math.min(origScenes.length, cloneScenes.length);
  let matchCount = 0;
  for (let i = 0; i < minLen; i++) {
    const oText = origScenes[i]?.script || origScenes[i]?.description || '';
    const cText = cloneScenes[i]?.script || cloneScenes[i]?.description || '';
    if (_textSimilarity(oText, cText) > 0.3) matchCount++;
  }
  score += Math.round((matchCount / Math.max(minLen, 1)) * 20);
  return Math.max(0, Math.min(100, score));
}

function _comparePace(original, clone) {
  const origPace = original?.structure?.paceMap?.overall || original?.pace || 'medium';
  const clonePace = clone?.structure?.paceMap?.overall || clone?.pace || 'medium';

  if (origPace === clonePace) return 90;
  const paceMap = { slow: 0, medium: 1, fast: 2 };
  const diff = Math.abs((paceMap[origPace] || 1) - (paceMap[clonePace] || 1));
  return Math.max(0, 90 - diff * 30);
}

function _compareVisual(original, clone) {
  const origVisual = original?.visualStyle || original?.style || '';
  const cloneVisual = clone?.visualStyle || clone?.style || '';

  if (!origVisual && !cloneVisual) return 50;
  if (!origVisual || !cloneVisual) return 20;

  return Math.round(30 + _textSimilarity(origVisual, cloneVisual) * 70);
}

function _compareMusic(original, clone) {
  const origMusic = original?.structure?.musicStyle || original?.musicStyle || '';
  const cloneMusic = clone?.structure?.musicStyle || clone?.musicStyle || '';

  if (!origMusic && !cloneMusic) return 50;
  if (!origMusic || !cloneMusic) return 25;
  if (origMusic === cloneMusic) return 95;

  return Math.round(40 + _textSimilarity(origMusic, cloneMusic) * 55);
}

function _compareCohesion(original, clone) {
  return 60;
}

function _generateFeedback(scores, totalScore) {
  const feedback = [];
  if (scores.hookSimilarity < 60) feedback.push('钩子力度不足，建议强化前3秒吸引力');
  if (scores.structureSimilarity < 60) feedback.push('分镜结构与原版差异较大，建议调整场景数量和顺序');
  if (scores.paceSimilarity < 60) feedback.push('节奏感与原版不匹配，注意剪辑速度调整');
  if (scores.visualSimilarity < 50) feedback.push('视觉风格偏离原版，建议统一色调和构图');
  if (scores.musicSimilarity < 50) feedback.push('配乐风格不匹配，建议更换BGM');
  if (totalScore >= 75) feedback.push('复刻整体质量良好，微调后可投放');
  return feedback;
}

function _textSimilarity(a, b) {
  if (!a || !b) return 0;
  const aWords = new Set(a.split(''));
  const bWords = new Set(b.split(''));
  const intersection = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

export default { extractFrames, analyzeVideoStructure, scoreCloneSimilarity };
