import * as logDao from '../dao/logDao.js';

export async function logAiCall(params) {
  return logDao.insertAiCallLog(params);
}

export async function listAiCallLogs(params) {
  return logDao.listAiCallLogs(params);
}

export async function getAiCallStats() {
  return logDao.getAiCallDailyStats();
}

export async function logOperation(params) {
  return logDao.insertOperationLog(params);
}

export async function listOperationLogs(params) {
  return logDao.listOperationLogs(params);
}

export async function saveGeneratedImage(params) {
  return logDao.insertGeneratedImage(params);
}

export async function saveGeneratedVideo(params) {
  return logDao.insertGeneratedVideo(params);
}

export async function listGeneratedImages(userId, params) {
  return logDao.listGeneratedImages(userId, params);
}

export async function listGeneratedVideos(userId, params) {
  return logDao.listGeneratedVideos(userId, params);
}
