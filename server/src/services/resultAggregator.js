export function aggregateResults(results, taskType) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  const aggregated = {
    taskType,
    modelCount: results.length,
    models: results.map((r) => r.modelId || 'unknown'),
    primary: results[0]?.output || results[0],
    secondary: results.slice(1).map((r) => r?.output || r),
    mergedAt: new Date().toISOString(),
  };

  // 合规检查 → 多数投票
  if (taskType === 'compliance_check' && results.length >= 3) {
    const votes = results.map((r) => r?.output?.decision || r?.output?.pass);
    const passCount = votes.filter((v) => v === true || v === 'pass').length;
    aggregated.voteResult = passCount >= 2 ? 'pass' : 'reject';
    aggregated.voteDetail = { pass: passCount, total: votes.length };
  }

  return aggregated;
}
