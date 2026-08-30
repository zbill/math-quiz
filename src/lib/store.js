// 数据存储层（本地 localStorage）
// 预留「云同步」接入点：约 store.sync()，后续切换 Supabase 等仅需替换本文件实现。

const KEYS = {
  users: 'mq_users',
  sessions: 'mq_sessions',
  records: 'mq_records', // 按 sessionId 存整场
  wrongBook: 'mq_wrongbook',
  statsDaily: 'mq_stats_daily',
  unlock: 'mq_unlock',
  settings: 'mq_settings',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('存储失败', e);
  }
}

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ============ 用户 ============
export const userStore = {
  list() {
    return read(KEYS.users, []);
  },
  save(user) {
    const list = this.list();
    const i = list.findIndex((u) => u.id === user.id);
    if (i >= 0) list[i] = user;
    else list.push(user);
    write(KEYS.users, list);
  },
  get(id) {
    return this.list().find((u) => u.id === id) || null;
  },
  patch(id, partial) {
    const list = this.list();
    const i = list.findIndex((u) => u.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...partial, updatedAt: Date.now() };
    write(KEYS.users, list);
    return list[i];
  },
  create({ name, pin }) {
    const user = {
      id: uid(),
      name,
      pin: pin || '',
      createdAt: Date.now(),
      // 档案上也固定年级/学期/模式：设置页会同步写入
      grade: 1,
      semester: 1,
      mode: 'grade',
    };
    this.save(user);
    return user;
  },
};

// 当前登录会话
export const sessionStore = {
  get() {
    return read(KEYS.sessions, []);
  },
  active() {
    const s = this.get();
    return s.length ? s[s.length - 1] : null;
  },
  login(userId) {
    const s = this.get();
    s.push({ userId, at: Date.now() });
    write(KEYS.sessions, s.slice(-20));
  },
  logout() {
    write(KEYS.sessions, []);
  },
};

// ============ 答题记录 ============
export const recordStore = {
  all() {
    return read(KEYS.records, []);
  },
  byUser(userId) {
    return this.all().filter((r) => r.userId === userId);
  },
  add(rec) {
    const all = this.all();
    all.push(rec);
    write(KEYS.records, all);
    return rec;
  },
};

// ============ 错题本 ============
export const wrongStore = {
  all() {
    return read(KEYS.wrongBook, []);
  },
  byUser(userId) {
    return this.all().filter((w) => w.userId === userId);
  },
  // 记录一题对错的记账
  track(userId, q, correct, sessionDate) {
    const all = this.all();
    if (correct) {
      // 答对了，从错题本移除（若存在）
      const next = all.filter(
        (w) => !(w.userId === userId && w.qid === q.qid)
      );
      write(KEYS.wrongBook, next);
      return;
    }
    // 答错：新增或更新
    let found = all.find((w) => w.userId === userId && w.qid === q.qid);
    const entry = {
      userId,
      qid: q.qid || uid(),
      op: q.op,
      symbol: q.symbol,
      a: q.a,
      b: q.b,
      chain: q.chain || false,
      expression: q.expression,
      answer: q.answer,
      spec: q.spec,
      wrongCount: 0,
      lastWrongAt: Date.now(),
      firstWrongAt: found ? found.firstWrongAt : Date.now(),
      sessions: [],
    };
    if (found) {
      found.wrongCount += 1;
      found.lastWrongAt = Date.now();
      found.sessions.push(sessionDate);
      write(KEYS.wrongBook, all);
      return;
    }
    entry.wrongCount = 1;
    all.push(entry);
    write(KEYS.wrongBook, all);
  },
  remove(qid, userId) {
    write(
      KEYS.wrongBook,
      this.all().filter((w) => !(userId && w.userId === userId && w.qid === qid))
    );
  },
};

// ============ 每日统计 ============
export const statsDailyStore = {
  all() {
    return read(KEYS.statsDaily, []);
  },
  byUser(userId) {
    return this.all().filter((s) => s.userId === userId);
  },
  addOrMerge(stat) {
    const all = this.all();
    const i = all.findIndex(
      (s) => s.userId === stat.userId && s.date === stat.date
    );
    if (i >= 0) all[i] = stat;
    else all.push(stat);
    write(KEYS.statsDaily, all);
  },
  get(userId, date) {
    return this.byUser(userId).find((s) => s.date === date);
  },
};

// ============ 解锁状态（分阶段，滚动最近 N 道） ============
// 每题型 op 存 { stage, recent }：
//   stage 0/1/2/3  对应手填比例 0%/50%/75%/100%
//   recent         最近 N 道对错记录（0/1），够 N 道即按达标正确率判升档
export const STAGE_RATIO = [0, 0.5, 0.75, 1]; // 各阶段手填比例

export const unlockStore = {
  get() {
    return read(KEYS.unlock, {});
  },
  opState(userId, op) {
    return (this.get()[userId] || {})[op];
  },
  // 记录一题到最近 N 道窗口（超过 N 道则滚出最早的）
  record(userId, op, correct, N) {
    const all = this.get();
    const me = all[userId] || {};
    // 旧/损坏格式没有 recent 数组，重置为干净状态
    const prev = me[op];
    const st =
      prev && Array.isArray(prev.recent) ? prev : { stage: 0, recent: [] };
    st.recent.push(correct ? 1 : 0);
    if (st.recent.length > N) st.recent.shift();
    me[op] = st;
    all[userId] = me;
    write(KEYS.unlock, all);
    return st;
  },
  // 阶段提升：进入下一档并清空最近窗口
  advance(userId, op) {
    const all = this.get();
    const me = all[userId] || {};
    const st = me[op] || { stage: 0, recent: [] };
    st.stage = Math.min(3, st.stage + 1);
    st.recent = [];
    me[op] = st;
    all[userId] = me;
    write(KEYS.unlock, all);
    return st;
  },
  // 阶段回落：正确率不达标时降一档并清空最近窗口（不低于第 0 档）
  downgrade(userId, op) {
    const all = this.get();
    const me = all[userId] || {};
    const st = me[op] || { stage: 0, recent: [] };
    st.stage = Math.max(0, st.stage - 1);
    st.recent = [];
    me[op] = st;
    all[userId] = me;
    write(KEYS.unlock, all);
    return st;
  },
  // 获取某题型当前手填比例
  ratio(userId, op) {
    const st = this.opState(userId, op);
    return st ? STAGE_RATIO[st.stage || 0] : 0;
  },
  stage(userId, op) {
    return this.opState(userId, op)?.stage ?? 0;
  },
  all(userId) {
    return this.get()[userId] || {};
  },
};

// ============ 全局设置 ============
export const settingsStore = {
  get() {
    return read(KEYS.settings, {});
  },
  set(partial) {
    write(KEYS.settings, { ...this.get(), ...partial });
  },
  // 按用户维度存取：记录每个用户最后一次的 年级/学期/模式
  // 用法：settingsStore.getUserPrefs(userId) -> {grade, semester, mode, ops, qCount...}
  userPrefs(userId, patch) {
    const all = this.get();
    const byUser = all.byUser || {};
    if (!patch) return byUser[userId] || {};
    byUser[userId] = { ...(byUser[userId] || {}), ...patch };
    write(KEYS.settings, { ...all, byUser });
    return byUser[userId];
  },
};

// ============ 云同步辅助（方式B：按用户分文档） ============
// 云端布局：
//   - 文档 users     ：所有用户档案（登录页列出全部使用者）
//   - 文档 u_<uid>   ：单个用户的 答题/错题/统计/解锁/设置（用户隔离）
// 本地仍按整份数组存储；导出/导入时按 userId 过滤、合并，保证互不串号。

export function dumpProfiles() {
  return read(KEYS.users, []);
}

// 导入用户档案：按 id 合并，云端字段覆盖本地同名用户，保留本地独有的用户
export function loadProfiles(list) {
  if (!Array.isArray(list) || list.length === 0) return;
  const local = read(KEYS.users, []);
  const map = new Map(local.map((u) => [u.id, u]));
  list.forEach((cu) => {
    const lu = map.get(cu.id);
    map.set(cu.id, lu ? { ...lu, ...cu } : cu);
  });
  write(KEYS.users, Array.from(map.values()));
}

// 导出某个用户在整份本地状态中的子集
export function dumpUserState(userId) {
  return {
    records: read(KEYS.records, []).filter((r) => r.userId === userId),
    wrongbook: read(KEYS.wrongBook, []).filter((w) => w.userId === userId),
    statsDaily: read(KEYS.statsDaily, []).filter((s) => s.userId === userId),
    unlock: read(KEYS.unlock, {})[userId] || {},
    settings: (read(KEYS.settings, {}).byUser || {})[userId] ?? null,
  };
}

// 把某个用户的云端子集合并进整份本地状态（先清该用户旧数据，再写入云端数据）
export function loadUserState(userId, data) {
  if (!data || typeof data !== 'object') return;

  if (Array.isArray(data.records)) {
    write(KEYS.records, [
      ...read(KEYS.records, []).filter((r) => r.userId !== userId),
      ...data.records,
    ]);
  }
  if (Array.isArray(data.wrongbook)) {
    write(KEYS.wrongBook, [
      ...read(KEYS.wrongBook, []).filter((w) => w.userId !== userId),
      ...data.wrongbook,
    ]);
  }
  if (Array.isArray(data.statsDaily)) {
    write(KEYS.statsDaily, [
      ...read(KEYS.statsDaily, []).filter((s) => s.userId !== userId),
      ...data.statsDaily,
    ]);
  }
  if (data.unlock && typeof data.unlock === 'object') {
    const all = read(KEYS.unlock, {});
    all[userId] = data.unlock;
    write(KEYS.unlock, all);
  }
  const settings = read(KEYS.settings, {});
  const byUser = settings.byUser || {};
  if (data.settings) byUser[userId] = data.settings;
  else delete byUser[userId];
  write(KEYS.settings, { ...settings, byUser });
}

export const newId = uid;