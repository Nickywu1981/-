import * as logDao from '../dao/logDao.js';

export async function listAiLogs({ page = 1, pageSize = 20, type, status }) {
  // map 'type' filter to model_id for compatibility
  return logDao.listAiCallLogs({ modelId: type, status, page, pageSize });
}

export async function getStats() {
  return logDao.getAiCallStats();
}
