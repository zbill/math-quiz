// 云端 API 客户端（腾讯 CloudBase PG 模式 / PostgreSQL + PostgREST）
// 方案 B：按用户分「行」存储，一条 doc 一行。
// 数据表：`public.app_state`（doc_id 主键 + payload jsonb）
//
// 部署步骤（前三步在控制台完成）：
//   1) 数据库中建表并授权（可在控制台 SQL 或 CLI `tcb db execute` 执行）：
//        CREATE TABLE IF NOT EXISTS public.app_state (
//          doc_id text PRIMARY KEY,
//          payload jsonb NOT NULL DEFAULT '{}'::jsonb
//        );
//        ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
//        CREATE POLICY app_state_select ON public.app_state
//          FOR SELECT TO anon USING (true);
//        CREATE POLICY app_state_insert ON public.app_state
//          FOR INSERT TO anon WITH CHECK (true);
//        CREATE POLICY app_state_update ON public.app_state
//          FOR UPDATE TO anon USING (true) WITH CHECK (true);
//        GRANT SELECT, INSERT, UPDATE ON public.app_state TO anon;
//
//   2) 生成 Publishable Key，填入下面 ACCESS_KEY（anon 令牌，默认只读；
//      上面的 RLS + GRANT 已放开其读写，使本应用可无损读写）。
//   3) 把站点域名加入「环境 → 安全配置 → Web 安全域名」。
//   4) 未填 ENV_ID 或 ACCESS_KEY 时自动回退「本地模式」。
import cloudbase from '@cloudbase/js-sdk';

// ====== 只改这里：环境 ID 与 Publishable Key ======
const ENV_ID = 'rain-d3ggdsj6a9cc1c4ea';
const ACCESS_KEY = ''; // 控制台 → 数据库 → API 密钥 / Publishable Key
// =================================================

const TABLE = 'app_state';

let rdb = null;

function init() {
  if (rdb) return;
  const app = cloudbase.init({ env: ENV_ID, accessKey: ACCESS_KEY });
  rdb = app.rdb();
}

export function cloudBase() {
  return ENV_ID && ACCESS_KEY ? 'cloudbase-pg' : '';
}
export function cloudEnabled() {
  return !!(ENV_ID && ACCESS_KEY);
}

const toDocId = (path) => String(path || '').replace(/^\/+/, '') || 'global';

// 通用请求：path 即 doc_id（如 /users、/u_abc123），与 cloud.js 调用签名一致
export async function apiFns(path, { method = 'GET', body } = {}) {
  if (!cloudEnabled()) return null;
  init();

  // GET：读取某行 payload。不存在统一返回 null（视为尚无云端数据）
  if (method === 'GET') {
    try {
      const { data, error } = await rdb
        .from(TABLE)
        .select('payload')
        .eq('doc_id', toDocId(path))
        .limit(1);
      if (error) return null;
      if (!Array.isArray(data) || data.length === 0) return null;
      return data[0].payload || null;
    } catch (e) {
      return null;
    }
  }

  // PUT：按主键 upsert（覆盖写整行 payload，不存在自动插入）
  if (method === 'PUT') {
    try {
      const { error } = await rdb
        .from(TABLE)
        .upsert({ doc_id: toDocId(path), payload: body }, { onConflict: 'doc_id' });
      if (error) throw error;
      return true;
    } catch (e) {
      // 数据库权限若禁止写，抛出，由 cloud.js 捕获并静默回退
      throw e;
    }
  }

  return null;
}