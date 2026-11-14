import type { ScenarioRequest, ScenarioResult, Site } from './types';

export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail) ? body.detail.map((d: { msg: string }) => d.msg).join('; ') : body.detail;
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchSites(): Promise<Site[]> {
  return json<Site[]>(await fetch(`${API_BASE}/api/sites`));
}

export async function fetchScenario(req: ScenarioRequest): Promise<ScenarioResult> {
  return json<ScenarioResult>(
    await fetch(`${API_BASE}/api/scenario`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req),
    }),
  );
}

export async function pingHealth(timeoutMs = 4000): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: ctl.signal });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
