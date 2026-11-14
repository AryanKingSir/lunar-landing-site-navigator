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
