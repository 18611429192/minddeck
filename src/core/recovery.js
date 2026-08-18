export function estimateUtf8Bytes(text) {
  return Buffer.byteLength(String(text ?? ''), 'utf8');
}

export function historyLimitForBytes(bytes) {
  if (bytes > 8 * 1024 * 1024) return 6;
  if (bytes > 2 * 1024 * 1024) return 20;
  return 80;
}

export function createRecoveryEnvelope(project, reason = 'manual-backup', date = new Date()) {
  return {
    format: 1,
    savedAt: date.toISOString(),
    reason,
    project: structuredClone(project),
  };
}

export function parseRecoveryEnvelope(text) {
  try {
    const value = typeof text === 'string' ? JSON.parse(text) : text;
    if (!value || value.format !== 1 || !value.project || typeof value.project !== 'object') return null;
    return value;
  } catch {
    return null;
  }
}
