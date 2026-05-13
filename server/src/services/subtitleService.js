/**
 * 字幕服务 — 脚本→SRT→视频烧录叠加
 *
 * 功能:
 *   1. 从脚本scenes生成SRT字幕文件
 *   2. ffmpeg烧录字幕到视频 (软字幕/硬字幕)
 *   3. 字幕样式管理 (位置/字体/颜色/大小)
 *
 * 依赖: ffmpeg (可选，无ffmpeg时仅生成SRT文件)
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

const execFileP = promisify(execFile);
const fsWriteFile = promisify(fs.writeFile);
const fsMkdir = promisify(fs.mkdir);

// ==================== SRT 生成 ====================

/**
 * 从脚本scenes生成SRT字幕内容
 *
 * @param {Array} scenes  脚本分镜 [{number, seconds, script, ...}]
 * @param {object} [opts]
 * @param {number} [opts.totalDuration] 总时长(秒)，用于推断分镜时长
 * @param {string} [opts.language] 语言代码，默认 zh-CN
 * @returns {string} SRT格式文本
 */
export function generateSrt(scenes, opts = {}) {
  if (!scenes || !scenes.length) return '';

  const totalDuration = opts.totalDuration || 30;
  const lines = [''];  // SRT file starts with empty line before first entry

  // 解析已有时间戳或均匀分配
  const hasTimestamps = scenes.some(s => s.seconds && s.seconds.includes('-'));

  let entries;
  if (hasTimestamps) {
    entries = scenes.map(s => _parseTimestampedScene(s));
  } else {
    entries = _distributeEvenly(scenes, totalDuration);
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    lines.push(`${i + 1}`);
    lines.push(`${e.start} --> ${e.end}`);
    lines.push(e.text);
    lines.push('');
  }

  return lines.join('\n');
}

function _parseTimestampedScene(scene) {
  const parts = (scene.seconds || '0-5').split('-');
  return {
    start: _secondsToSrtTime(parseFloat(parts[0]) || 0),
    end: _secondsToSrtTime(parseFloat(parts[1]) || 5),
    text: scene.script || scene.visual || scene.description || '',
  };
}

function _distributeEvenly(scenes, totalDuration) {
  const perScene = totalDuration / scenes.length;
  return scenes.map((s, i) => ({
    start: _secondsToSrtTime(i * perScene),
    end: _secondsToSrtTime((i + 1) * perScene - 0.1),
    text: s.script || s.visual || s.description || s.text || '',
  }));
}

function _secondsToSrtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// ==================== 字幕样式预设 ====================

const STYLE_PRESETS = {
  qianchuan: {
    fontName: 'PingFang SC',
    fontSize: 18,
    primaryColor: '&H00FFFFFF',   // 白色
    outlineColor: '&H00000000',   // 黑色描边
    outlineWidth: 2.5,
    alignment: 2,                  // 底部居中
    marginV: 50,
    override: 'MarginV=50,Outline=2.5,Shadow=1',
  },
  magnetic: {
    fontName: 'PingFang SC',
    fontSize: 20,
    primaryColor: '&H00FFFF00',   // 黄色
    outlineColor: '&H00000000',
    outlineWidth: 3,
    alignment: 2,
    marginV: 60,
    override: 'MarginV=60,Outline=3,Bold=1',
  },
  alimama: {
    fontName: 'Microsoft YaHei',
    fontSize: 16,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00333333',
    outlineWidth: 2,
    alignment: 2,
    marginV: 40,
    override: 'MarginV=40,Outline=2',
  },
  default: {
    fontName: 'PingFang SC',
    fontSize: 18,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    outlineWidth: 2.5,
    alignment: 2,
    marginV: 50,
    override: 'MarginV=50,Outline=2.5',
  },
};

// ==================== 字幕烧录 ====================

/**
 * 将字幕烧录到视频 (硬字幕)
 *
 * @param {string} videoUrl     视频文件路径
 * @param {Array} scenes        分镜场景
 * @param {object} [opts]
 * @param {string} [opts.platform] 平台 → 选择字幕样式
 * @param {number} [opts.duration] 视频总时长(秒)
 * @param {string} [opts.outputDir] 输出目录
 * @returns {{ subtitledUrl, srtContent, srtPath, method }}
 */
export async function burnSubtitles(videoUrl, scenes, opts = {}) {
  if (!videoUrl || !scenes?.length) {
    return { subtitledUrl: videoUrl, srtContent: '', method: 'none', reason: 'no video or scenes' };
  }

  const srtContent = generateSrt(scenes, { totalDuration: opts.duration || 30 });
  if (!srtContent) {
    return { subtitledUrl: videoUrl, srtContent: '', method: 'none', reason: 'empty SRT' };
  }

  const outputDir = opts.outputDir || os.tmpdir();
  await fsMkdir(outputDir, { recursive: true }).catch(e => { throw new BusinessError(500, '输出目录创建失败', { outputDir, reason: e.message }); });

  const srtPath = path.join(outputDir, `subtitle_${Date.now()}.srt`);
  await fsWriteFile(srtPath, srtContent, 'utf-8');

  // 尝试 ffmpeg 烧录
  try {
    await execFileP('ffmpeg', ['-version'], { timeout: 3000 });
    const outFile = path.join(outputDir, `subtitled_${Date.now()}.mp4`);
    const style = STYLE_PRESETS[opts.platform] || STYLE_PRESETS.default;

    const subtitleFilter = `subtitles='${srtPath.replace(/\\/g, '/')}':force_style='FontName=${style.fontName},FontSize=${style.fontSize},PrimaryColour=${style.primaryColor},OutlineColour=${style.outlineColor},Outline=${style.outlineWidth},Alignment=${style.alignment},MarginV=${style.marginV}'`;

    await execFileP('ffmpeg', [
      '-i', videoUrl,
      '-vf', subtitleFilter,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      outFile,
    ], { timeout: 120000 });

    logger.info('[Subtitle] ffmpeg burn complete', { outFile, scenes: scenes.length });
    return { subtitledUrl: outFile, srtContent, srtPath, method: 'ffmpeg_burn' };
  } catch (err) {
    logger.warn('[Subtitle] ffmpeg unavailable or failed, returning SRT only', err.message.slice(0, 80));
  }

  // 降级：仅返回SRT文件(前端/播放器加载软字幕)
  return {
    subtitledUrl: videoUrl,
    srtContent,
    srtPath,
    method: 'soft_subtitle',
    instructions: 'SRT subtitle file ready. Use video player with subtitle support or install ffmpeg for hard burn.',
  };
}

/**
 * 从脚本内容自动提取分镜字幕
 * 兼容 engine ctx 中的 scriptContent 字段
 *
 * @param {string} scriptContent  脚本文本(JSON或纯文本)
 * @param {number} totalDuration  总时长
 * @returns {{ scenes, srtContent }}
 */
export function extractScenesForSubtitle(scriptContent, totalDuration = 30) {
  if (!scriptContent) return { scenes: [], srtContent: '' };

  // 尝试解析JSON脚本
  try {
    const parsed = JSON.parse(scriptContent);
    if (parsed.scenes?.length) {
      const srtContent = generateSrt(parsed.scenes, { totalDuration: parsed.totalDuration || totalDuration });
      return { scenes: parsed.scenes, srtContent };
    }
    if (Array.isArray(parsed) && parsed[0]?.script) {
      const srtContent = generateSrt(parsed, { totalDuration });
      return { scenes: parsed, srtContent };
    }
  } catch {}

  // 纯文本: 按句号/换行分割为伪分镜
  const sentences = scriptContent
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  if (sentences.length === 0) return { scenes: [], srtContent: '' };

  const scenes = sentences.map((s, i) => ({
    number: i + 1,
    script: s,
    visual: '',
  }));

  const srtContent = generateSrt(scenes, { totalDuration });
  return { scenes, srtContent };
}

export { STYLE_PRESETS };
export default { generateSrt, burnSubtitles, extractScenesForSubtitle };
