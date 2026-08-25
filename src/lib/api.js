// 云端 API 客户端（EdgeOne Cloud Function）
// 默认「本地模式」：未配置云端地址时所有读写走 localStorage，与之前一致。
// 开启云同步：在 index.html 里设 window.MQ_CLOUD_URL，或在构建时注入 VITE_MQ_CLOUD_URL。

export function cloudBase() {
  if (typeof window !== 'undefined' && window.MQ_CLOUD_URL) {
    return String(window.MQ_CLOUD_URL).replace(/\/+$/, '');
  }
  if (import.meta.env && import.meta.env.VITE_MQ_CLOUD_URL) {
    return String(import.meta.env.VITE_MQ_CLOUD_URL).replace(/\/+$/, '');
  }
  return '';
}

export function cloudEnabled() {
  return !!cloudBase();
}

const TIMEOUT_MS = 8000;

// 通用请求；返回云端解析后的 data（云端约定 { ok, data }）
export async function apiFns(path, { method = 'GET', body } = {}) {
  const base = cloudBase();
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    return data && data.ok ? data.data : data;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}