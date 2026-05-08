import * as sensitiveWordDao from '../dao/sensitiveWordDao.js';

export async function listSensitiveWords(options) {
  return sensitiveWordDao.listSensitiveWords(options || {});
}

export async function addSensitiveWord(word, category) {
  return sensitiveWordDao.addSensitiveWord(word, category);
}

export async function deleteSensitiveWord(id) {
  return sensitiveWordDao.deleteSensitiveWord(id);
}

export async function checkText(text) {
  return sensitiveWordDao.checkText(text);
}
