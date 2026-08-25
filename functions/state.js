// EdgeOne Makers Cloud Function —— 全局应用状态读写（承载多端同步）
// 端点：GET  /state   拉取整份状态（JSON）
//       PUT  /state   覆盖整份状态（PUT body 为完整 JSON）
//
// 说明：这是可直接上架的模板。核心只做「一个文档的读/写」。
// - 需在 EdgeOne Makers 控制台把 storage 绑定到本函数的 env.STATE（KV 或 Blob 均可）。
// - 若你的 runtime 的存读接口签名不同，只改 store.get / store.set 两处即可，
//   其余（路由、序列化、返回格式）保持不变。
//
// 返回统一为 { ok: boolean, data?: any }，前端 api.js 直接取 data。

function json(status, payload) {
  return { statusCode: status, body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } };
}

export function main(event, context) {
  const method = (event.method || 'GET').toUpperCase();
  const KEY = 'mathquiz-state';
  const store = event.env && event.env.STATE;

  // GET：读文档
  if (method === 'GET') {
    let raw;
    try {
      raw = store ? store.get(KEY) : null;
    } catch (e) {
      return json(500, { ok: false, error: String(e) });
    }
    let data = null;
    if (typeof raw === 'string' && raw) {
      try { data = JSON.parse(raw); } catch { data = null; }
    } else if (raw && typeof raw === 'object') {
      data = raw;
    }
    return json(200, { ok: true, data });
  }

  // PUT：写文档（覆盖）
  if (method === 'PUT') {
    const body = event.body || {};
    if (!store) return json(500, { ok: false, error: 'storage not bound to env.STATE' });
    try {
      store.set(KEY, JSON.stringify(body));
    } catch (e) {
      return json(500, { ok: false, error: String(e) });
    }
    return json(200, { ok: true });
  }

  return json(405, { ok: false });
}