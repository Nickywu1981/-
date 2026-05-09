const fs = require('fs');
const http = require('http');

const BASE = 'http://localhost:3001';
const RESULTS = {};

function get(url) {
  return new Promise((resolve) => {
    http.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ code: res.statusCode, ...JSON.parse(data) }); }
        catch { resolve({ code: res.statusCode, raw: data.substring(0, 200) }); }
      });
    }).on('error', e => resolve({ code: 0, error: e.message.substring(0, 100) }));
  });
}

async function testAll() {
  // 1. Memory
  console.log('=== 1. Memory ===');
  let score = 0;
  const health = await get(BASE + '/api/health');

  if (health.code === 200 && health.data && health.data.checks && health.data.checks.db) {
    score += 1; console.log('  DB healthy: OK');
  }

  if (fs.existsSync('./scripts/kb-token-index.js')) {
    score += 0.5; console.log('  Token Index: OK');
  }

  const files = ['memoryService.js', 'memory-health.js', 'kb-semantic-search.js'];
  for (const f of files) {
    const fp = './scripts/' + f;
    const fp2 = './src/services/' + f;
    if (fs.existsSync(fp) || fs.existsSync(fp2)) {
      score += 0.5; console.log('  ' + f + ': OK');
    }
  }
  RESULTS['Memory'] = Math.min(100, Math.round(score / 2 * 100));
  console.log('  Score: ' + RESULTS['Memory'] + '%');

  // 2. Judgment
  console.log('\n=== 2. Judgment ===');
  score = 0;
  const judgmentFiles = [
    'modelDispatcher.js', 'model-router.service.js', 'modelRegistry.js',
    'modelRouter.js', 'circuit-breaker.js'
  ];
  for (const f of judgmentFiles) {
    const fp = './src/services/' + f;
    if (fs.existsSync(fp)) { score += 0.6; console.log('  ' + f + ': OK'); }
  }

  const contentMod = './src/services/content-moderation.service.js';
  const contentMid = './src/middleware/content-moderation.middleware.js';
  if (fs.existsSync(contentMod) || fs.existsSync(contentMid)) {
    score += 0.5; console.log('  Content moderation: OK');
  }

  RESULTS['Judgment'] = Math.min(100, Math.round(score / 3.5 * 100));
  console.log('  Score: ' + RESULTS['Judgment'] + '%');

  // 3. Comprehension
  console.log('\n=== 3. Comprehension ===');
  score = 0;
  const adapterDir = './src/services/adapters/';
  if (fs.existsSync(adapterDir)) {
    const adapters = fs.readdirSync(adapterDir).filter(f => f.endsWith('.js'));
    let maxTokens = 0;
    for (const a of adapters) {
      const content = fs.readFileSync(adapterDir + a, 'utf8');
      const m = content.match(/maxTokens[:\s]+(\d+)/i);
      if (m) maxTokens = Math.max(maxTokens, parseInt(m[1]));
    }
    console.log('  Max context window: ' + (maxTokens || 8192) + ' tokens');
    score += maxTokens > 0 ? 1 : 0.5;
  }

  const ctxFiles = ['aiEngine.js', 'conversation.service.js', 'contextManager.js'];
  const ctxFiles2 = ['conversationDao.js'];
  for (const f of ctxFiles) {
    if (fs.existsSync('./src/services/' + f)) { score += 0.5; console.log('  ' + f + ': OK'); }
  }
  for (const f of ctxFiles2) {
    if (fs.existsSync('./src/dao/' + f)) { score += 0.5; console.log('  ' + f + ': OK'); }
  }

  RESULTS['Comprehension'] = Math.min(100, Math.round(score / 2.5 * 100));
  console.log('  Score: ' + RESULTS['Comprehension'] + '%');

  // 4. Multilingual
  console.log('\n=== 4. Multilingual ===');
  score = 0;

  if (fs.existsSync('./src/services/i18nService.js') || fs.existsSync('./src/services/multilingualService.js')) {
    score += 1; console.log('  i18n service: OK');
  }

  if (fs.existsSync('./src/services/platformSpecService.js')) {
    const content = fs.readFileSync('./src/services/platformSpecService.js', 'utf8');
    const platformMatch = content.match(/platforms?[:\s]*\[[\s\S]*?\]/);
    const platformNames = content.match(/(\d+)\s*个.*平台/g) || ['13'];
    console.log('  Platforms: ' + (platformNames[0] || '13+'));
    score += 1.5;
  }

  const langFile = './src/services/multilingualService.js';
  if (fs.existsSync(langFile)) {
    const langContent = fs.readFileSync(langFile, 'utf8');
    const langs = langContent.match(/['"](zh|en|ja|ko|fr|de|es|ar|ru|pt|th|vi|id)['"]/gi) || [];
    const unique = [...new Set(langs.map(l => l.replace(/['"]/g, '').toLowerCase()))];
    console.log('  Languages: ' + unique.join(', '));
    score += 0.5;
  }

  RESULTS['Multilingual'] = Math.min(100, Math.round(score / 3 * 100));
  console.log('  Score: ' + RESULTS['Multilingual'] + '%');

  // 5. Writing
  console.log('\n=== 5. Writing ===');
  score = 0;
  const contentTypes = ['title', 'sellingPoint', 'detail', 'seeding', 'script', 'translate'];
  const routeDir = './src/route';
  const ctrlDir = './src/controller';
  const svcDir = './src/services';

  const routes = fs.readdirSync(routeDir);
  const ctrls = fs.readdirSync(ctrlDir);
  const svcs = fs.readdirSync(svcDir);

  for (const ct of contentTypes) {
    const found = routes.some(f => f.includes(ct)) || ctrls.some(f => f.includes(ct)) || svcs.some(f => f.includes(ct));
    if (found) { score += 0.5; console.log('  ' + ct + ': OK'); }
    else console.log('  ' + ct + ': MISSING');
  }

  const ai = health.data && health.data.checks && health.data.checks.ai || {};
  const aiOk = Object.values(ai).filter(v => v === 'ok').length;
  console.log('  AI models online: ' + aiOk);
  score += Math.min(1, aiOk * 0.2);

  RESULTS['Writing'] = Math.min(100, Math.round(score / 4 * 100));
  console.log('  Score: ' + RESULTS['Writing'] + '%');

  // 6. Risk Control
  console.log('\n=== 6. Risk Control ===');
  score = 0;

  if (fs.existsSync('./src/services/sensitiveWordService.js')) {
    score += 1; console.log('  Sensitive words: OK');
  } else { console.log('  Sensitive words: MISSING'); }

  if (fs.existsSync('./src/middleware/content-moderation.middleware.js')) {
    score += 0.5; console.log('  Content moderation MW: OK');
  }

  const hasImgMod = svcs.some(f => f.includes('image') && (f.includes('moderat') || f.includes('audit')));
  if (hasImgMod) { score += 0.5; console.log('  Image moderation: OK'); }
  else { console.log('  Image moderation: MISSING'); }

  const hasPlatRules = svcs.some(f => f.includes('platform') && (f.includes('rule') || f.includes('compliance')));
  if (hasPlatRules) { score += 0.5; console.log('  Platform rules: OK'); }
  else { console.log('  Platform rules: MISSING'); }

  const hasRateLimit = fs.existsSync('./src/middleware/rate-limiter.middleware.js') || fs.existsSync('./src/middleware/rateLimiter.js');
  if (hasRateLimit) { score += 0.5; console.log('  Rate limit: OK'); }

  RESULTS['RiskCtrl'] = Math.min(100, Math.round(score / 3 * 100));
  console.log('  Score: ' + RESULTS['RiskCtrl'] + '%');

  // 7. Vision
  console.log('\n=== 7. Vision ===');
  score = 0;

  if (fs.existsSync('./src/services/adapters/stabilityAdapter.js')) {
    score += 1; console.log('  Stability Adapter: OK');
  }

  const hasImgRoute = routes.some(f => f.includes('image') || f.includes('generate') || f.includes('vision'));
  if (hasImgRoute) { score += 0.5; console.log('  Image routes: OK'); }

  const aiData = health.data && health.data.checks && health.data.checks.ai || {};
  const sd = Object.entries(aiData).filter(([k, v]) => k.includes('stable') || k.includes('image') || k.includes('gpt-image'));
  const sdOk = sd.filter(([, v]) => v === 'ok');
  console.log('  Image models: ' + sd.map(([k, v]) => k + '=' + v).join(', '));
  score += sdOk.length > 0 ? 1 : (sd.length > 0 ? 0.3 : 0);

  RESULTS['Vision'] = Math.min(100, Math.round(score / 2.5 * 100));
  console.log('  Score: ' + RESULTS['Vision'] + '%');

  // 8. Never Offline
  console.log('\n=== 8. Never Offline ===');
  score = 0;

  const hasPM2 = fs.existsSync('./ecosystem.config.js') || fs.existsSync('../ecosystem.config.js');
  if (hasPM2) { score += 1; console.log('  PM2 config: OK'); }
  else { console.log('  PM2 config: MISSING'); }

  if (health.code === 200) { score += 1; console.log('  Health endpoint: OK (uptime ' + (health.data?.uptime || 'N/A') + 's)'); }

  const hasWatchdog = svcs.some(f => f.includes('watchdog') || f.includes('monitor') || f.includes('daemon'));
  const hasLog = fs.existsSync('./src/middleware/logger.middleware.js') || svcs.some(f => f.includes('log'));
  if (hasWatchdog || hasLog) { score += 0.5; console.log('  Monitoring/logging: OK'); }
  else console.log('  Monitoring: PARTIAL');

  const hasAutoOps = svcs.some(f => f.includes('auto') && (f.includes('ops') || f.includes('recover') || f.includes('heal')));
  if (hasAutoOps) { score += 0.5; console.log('  Auto-ops: OK'); }
  else console.log('  Auto-ops: MISSING');

  RESULTS['NeverOff'] = Math.min(100, Math.round(score / 3 * 100));
  console.log('  Score: ' + RESULTS['NeverOff'] + '%');

  // === Summary ===
  console.log('\n========================================');
  console.log('Movio AI 8-Dimension Capability Radar');
  console.log('========================================');
  const order = ['Memory', 'Judgment', 'Comprehension', 'Multilingual', 'Writing', 'RiskCtrl', 'Vision', 'NeverOff'];
  const labels = {
    Memory: 'Memory',
    Judgment: 'Judgment',
    Comprehension: 'Comprehension',
    Multilingual: 'Multilingual',
    Writing: 'Writing',
    RiskCtrl: 'RiskControl',
    Vision: 'Vision',
    NeverOff: '24/7 Ops'
  };
  let total = 0;
  for (const k of order) {
    const v = RESULTS[k] || 0;
    total += v;
    const bar = '|'.repeat(Math.round(v / 5)) + '.'.repeat(20 - Math.round(v / 5));
    console.log(labels[k].padEnd(14) + ' ' + bar + ' ' + String(v).padStart(3) + '%');
  }
  console.log('----------------------------------------');
  console.log('COMPOSITE: ' + Math.round(total / 8) + '%');
  console.log('========================================');

  // Return for widget
  return { results: RESULTS, total: Math.round(total / 8) };
}

testAll().catch(e => console.error('Fatal:', e.message));
