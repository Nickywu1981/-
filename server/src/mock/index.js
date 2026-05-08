import { mockEnabled } from '../config/index.js';

let store = null;

async function loadMockModule() {
  if (store) return store;
  try {
    store = (await import('./store.js')).default;
  } catch {
    store = {};
  }
  return store;
}

export async function getMockData(tableName, query = {}) {
  if (!mockEnabled) return null;

  const s = await loadMockModule();
  const rows = s[tableName];
  if (!rows) return null;

  let result = rows.map((r) => ({ ...r, isMock: true }));

  if (query.id) {
    result = result.filter((r) => r.id === Number(query.id));
  }

  return result;
}

export function isMockData(item) {
  return item?.isMock === true;
}
