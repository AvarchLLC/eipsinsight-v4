import { env } from '@/env';

/**
 * Minimal ClickHouse HTTP client for read-only analytics queries against the
 * BlobLens `blob_lens` database (MEV sandwich data surfaced on /lucid).
 *
 * Credentials live in env only (CLICKHOUSE_URL / _USER / _PASSWORD). When they
 * are not configured — e.g. local dev without network access to ba-data — the
 * client is considered unavailable and callers should degrade gracefully.
 */

export function clickhouseConfigured(): boolean {
  return Boolean(env.CLICKHOUSE_URL && env.CLICKHOUSE_USER);
}

export async function clickhouseQuery<T = Record<string, unknown>>(
  sql: string,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<T[]> {
  if (!clickhouseConfigured()) {
    throw new Error('ClickHouse is not configured');
  }

  const url = `${env.CLICKHOUSE_URL}/?user=${encodeURIComponent(env.CLICKHOUSE_USER!)}&password=${encodeURIComponent(env.CLICKHOUSE_PASSWORD ?? '')}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: `${sql} FORMAT JSONEachRow`,
      headers: { 'Content-Type': 'text/plain' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`ClickHouse ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const text = await res.text();
    if (!text.trim()) return [];
    return text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } finally {
    clearTimeout(timer);
  }
}
