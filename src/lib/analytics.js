// 统计分析与方法指导

// 从一场记录的逐题数组计算汇总
export function summarize(questions) {
  const total = questions.length;
  const correct = questions.filter((q) => q.correct).length;
  // 错误类型：按 op 归纳
  const byOp = {};
  questions.forEach((q) => {
    if (!byOp[q.op]) byOp[q.op] = { op: q.op, total: 0, wrong: 0 };
    byOp[q.op].total += 1;
    if (!q.correct) byOp[q.op].wrong += 1;
  });
  const errors = Object.values(byOp)
    .filter((b) => b.wrong > 0)
    .map((b) => ({ ...b, rate: b.total ? Math.round((b.wrong / b.total) * 100) : 0 }))
    .sort((x, y) => y.wrong - x.wrong);
  return {
    total,
    correct,
    wrong: total - correct,
    correctRate: total ? Math.round((correct / total) * 100) : 0,
    avgTime: avgTimeOf(questions),
    byOp,
    errors,
  };
}

export function avgTimeOf(questions) {
  const timed = questions.filter((q) => typeof q.durationMs === 'number');
  if (!timed.length) return null;
  return Math.round(timed.reduce((s, q) => s + q.durationMs, 0) / timed.length);
}

// 方法指导：按运算符输出口诀/技巧
const OP_GUIDE = {
  add: '加法：满十进一。可先用凑十法（如 8+6=8+2+4=14），把大数凑成 10 再减掉多凑的数。',
  sub: '减法：被减数不小于减数。退位减法用破十法（如 13−7=10−7+3=6），先算整十再相加。',
  mul: '乘法：背熟乘法口诀表。两位数乘一位数，先用个位相乘再处理十位（拆开分别乘再相加）。',
  div: '除法：除法是乘法的逆运算，想“几乘几得被除数”。做整除题可回忆对应乘法口诀求商。',
};

export function getGuide(op) {
  return OP_GUIDE[op] || '先理清运算规则，再逐步计算。';
}

// 对错误题型给出针对性话术
const ERROR_HINTS = {
  mul: '记住：乘法计算易出错在口诀混淆，可把易混口诀（如 6×8 与 7×8）分开对比记。',
  div: '有余数或求商易错，先确认“商×除数＝被除数”，再检查是否有余数。',
  add: '加法易错在进位，写两位数相加时先算个位再算十位，注意进位上叠加。',
  sub: '减法易错在退位，记住“退一当十”，从低位向高位逐个算。',
};

export function getErrorHint(op) {
  return ERROR_HINTS[op] || getGuide(op);
}

// 运算维度 → 中文/符号显示名
export const OP_LABEL = {
  add: '+ 加法',
  sub: '− 减法',
  mul: '× 乘法',
  div: '÷ 除法',
  chainAddSub: '+− 连加连减',
  chainMulDiv: '×÷ 连乘连除',
};

export const getOpName = (op) => OP_LABEL[op] || op || '-';

// 把一场记录转为持久化结构（含逐题原始数据，用于错题回顾与重练）
export function buildSessionRecord({ userId, sessionId, questions, settings }) {
  const date = new Date();
  return {
    sessionId,
    userId,
    start: date.toISOString(),
    end: new Date().toISOString(),
    date: fmtDate(date),
    settings,
    questions: questions.map((q) => ({
      qid: q.qid,
      op: q.op,
      symbol: q.symbol,
      a: q.a,
      b: q.b,
      answer: q.answer,
      userAnswer: q.userAnswer ?? null,
      correct: q.correct,
      durationMs: q.durationMs,
      options: q.options,
      spec: q.spec,
    })),
  };
}

export function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtTime(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}分${rest}秒`;
}