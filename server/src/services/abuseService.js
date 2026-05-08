import * as abuseDao from '../dao/abuseDao.js';

export async function checkHighFrequency(userId, windowSeconds = 60, threshold = 30) {
  const cnt = await abuseDao.countUserRecentCalls(userId, windowSeconds);
  return cnt > threshold;
}

export async function recordApiCall({ userId, apiPath, ip, userAgent }) {
  return abuseDao.insertApiCall({ userId, apiPath, ip, userAgent });
}

export async function checkIpAbuse(ip, windowSeconds = 3600, threshold = 500) {
  const cnt = await abuseDao.countIpRecentCalls(ip, windowSeconds);
  return cnt > threshold;
}

export async function listAbuseRecords(params) {
  return abuseDao.listAbuseRecords(params);
}

export default { checkHighFrequency, recordApiCall, checkIpAbuse, listAbuseRecords };
