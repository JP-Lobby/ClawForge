const API_URL_KEY = 'clawforge:apiUrl';
const AUTH_TOKEN_KEY = 'clawforge:authToken';

export interface ApiConfig {
  apiUrl: string;
  authToken: string;
}

export function getConfig(): ApiConfig {
  return {
    apiUrl: localStorage.getItem(API_URL_KEY) ?? '',
    authToken: localStorage.getItem(AUTH_TOKEN_KEY) ?? '',
  };
}

export function setConfig(config: Partial<ApiConfig>): void {
  if (config.apiUrl !== undefined) localStorage.setItem(API_URL_KEY, config.apiUrl);
  if (config.authToken !== undefined) localStorage.setItem(AUTH_TOKEN_KEY, config.authToken);
}

export function getApiUrl(): string { return localStorage.getItem(API_URL_KEY) ?? ''; }
export function setApiUrl(url: string): void { localStorage.setItem(API_URL_KEY, url); }
export function getAuthToken(): string { return localStorage.getItem(AUTH_TOKEN_KEY) ?? ''; }
export function setAuthToken(token: string): void { localStorage.setItem(AUTH_TOKEN_KEY, token); }

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiUrl, authToken } = getConfig();
  const base = apiUrl.replace(/\/$/, '');
  const url = base + path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
