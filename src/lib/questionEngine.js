// 出题引擎：根据模式与规则生成题目 + 选项

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 小数生成与精度修正：按 decimalPlaces 返回一个"整数倍 10^-dp"的浮点数
function makeDecimal({ min, max, dp }) {
  const factor = Math.pow(10, dp);
  const mi = Math.ceil(min * factor);
  const ma = Math.floor(max * factor);
  if (ma <= mi) return Math.round(max * factor) / factor;
  return randInt(mi, ma) / factor;
}
function roundForOp(v, dp) {
  if (dp <= 0) return v;
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

// 格式化数字（避免 0.1 + 0.2 = 0.30000000000000004 的展示问题；并去掉末尾多余 0）
function fmtNum(v, dp) {
  if (typeof v !== 'number') return String(v);
  if (!Number.isFinite(v)) return String(v);
  if (dp > 0) {
    const f = Math.pow(10, dp);
    const fixed = (Math.round(v * f) / f).toFixed(dp);
    // 去掉末尾多余的 0
    return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  return String(Math.round(v));
}

// 是否整十/整百控制
function applyMultiples(spec, op) {
  const step = spec.multiples10 ? 10 : spec.multiples100 ? 100 : 1;
  return step;
}

// 生成一对数并计算，返回 {a, b, answer}
function genOperands(spec) {
  const { type, aMin, aMax, bMin, bMax, decimalPlaces: dp = 0 } = spec;
  const step = applyMultiples(spec, type);
  const aStep = spec.multiples10 || spec.multiples100 ? step : 1;

  // 小数：用整数倍 10^dp 生成，确保 a、b、答案的显示精度互相对得上
  if (dp > 0) {
    const scale = Math.pow(10, dp);
    const toInt = (v) => Math.round(v * scale);
    if (type === 'add') {
      const a = randInt(Math.max(0, toInt(aMin)), toInt(aMax)) / scale;
      const b = randInt(Math.max(0, toInt(bMin)), toInt(bMax)) / scale;
      return { a, b, answer: a + b, opDp: dp, ansDp: dp };
    }
    if (type === 'sub') {
      let a = randInt(Math.max(0, toInt(aMin)), toInt(aMax)) / scale;
      let b = randInt(Math.max(0, toInt(bMin)), toInt(bMax)) / scale;
      if (a < b) [a, b] = [b, a];
      return { a, b, answer: a - b, opDp: dp, ansDp: dp };
    }
    if (type === 'mul') {
      // a、b 各 dp 位小数，积至多 2*dp 位
      const a = randInt(Math.max(1, toInt(aMin)), toInt(aMax)) / scale;
      const b = randInt(Math.max(1, toInt(bMin)), toInt(bMax)) / scale;
      return { a, b, answer: a * b, opDp: dp, ansDp: dp * 2 };
    }
    if (type === 'div') {
      // 用整数整除保证：a = b*商 ，显示 a/b 正好等于整数商，绝不出现对不上的情况
      const aMinInt = toInt(aMin);
      const aMaxInt = toInt(aMax);
      let guard = 80;
      while (guard--) {
        const bInt = randInt(Math.max(1, toInt(bMin)), Math.max(1, toInt(bMax)));
        const qMin = Math.max(1, Math.ceil(aMinInt / bInt));
        const qMax = Math.max(1, Math.floor(aMaxInt / bInt));
        if (qMax < qMin) continue;
        const q = randInt(qMin, qMax);
        const aInt = q * bInt;
        return { a: aInt / scale, b: bInt / scale, answer: q, opDp: dp, ansDp: 0 };
      }
      const bInt = randInt(Math.max(1, toInt(bMin)), Math.max(1, toInt(bMax)));
      const q = Math.max(1, Math.floor(aMaxInt / bInt));
      return { a: (q * bInt) / scale, b: bInt / scale, answer: q, opDp: dp, ansDp: 0 };
    }
  }

  // 归一化范围和步长
  const normMin = (v, st) => Math.ceil(v / st) * st;
  const normMax = (v, st) => Math.floor(v / st) * st;

  if (type === 'div' && spec.divisorFirst) {
    // b 是除数(一位数)，a = b * 商
    const b = randInt(Math.max(bMin,2), bMax);
    const q = randInt(Math.max(1, aMin), Math.min(9, aMax)); // 商(一位数)
    const a = b * q;
    if (a < b) return genOperands(spec);
    return { a, b, answer: q };
  }
  if (type === 'div') {
    // a = b * q 整除
    const b = randInt(bMin, bMax);
    const q = randInt(aMin, Math.min(aMax, 9));
    const a = b * q;
    return { a, b, answer: q };
  }
  if (type === 'mul') {
    const aSt = spec.multiples10 || spec.multiples100 ? step : 1;
    const na = randInt(normMin(aMin, aSt), normMax(aMax, aSt));
    const bSt = spec.multiples10 && !spec.aIsResult ? step : 1;
    const b = randInt(normMin(bMin, bSt), normMax(bMax, bSt));
    return { a: na, b: bMin === bMax && bMax > 9 && !spec.multiples10 ? randInt(bMin,bMax) : b, answer: na * b };
  }
  if (type === 'sub') {
    // a >= b，通过 b + 差 生成
    const b = randInt(bMin, Math.min(bMax, aMax - Math.max(aMin,1))) || aMin;
    const diff = randInt(Math.max(1, aMin - b), aMax - b);
    const a = b + diff;
    if (a > aMax || a < aMin) return genOperands(spec);
    return { a, b, answer: a - b };
  }
  // add
  const aSt = spec.multiples10 || spec.multiples100 ? step : 1;
  const a = randInt(normMin(aMin, aSt), normMax(aMax, aSt));
  const bSt = spec.multiples10 ? step : 1;
  const b = randInt(normMin(bMin, bSt), normMax(bMax, bSt));
  return { a, b, answer: a + b };
}

// 生成干扰项（分叉答案）
const THRESHOLD = 4; // 超过该数才置换数字，避免换位混乱
function distractors(answer) {
  const set = new Set([answer]);
    let tries = 50;
    while (set.size < 3 && tries--) {
    let d;
    const m = Math.floor(Math.random() * 4);
    if (m === 0) d = answer + randInt(1, Math.max(2, Math.round(Math.abs(answer) * 0.1) + 1));
    else if (m === 1) d = answer - randInt(1, Math.max(2, Math.round(Math.abs(answer) * 0.1) + 1));
    else if (m === 2) d = answer + randInt(2, 10);
    else d = answer - randInt(2, 10);
    if (d !== answer && d >= 0) set.add(d);
  }
  // 若不足3个，补任意非负数
  let guard = 50;
  while (set.size < 3 && guard--) {
    const d = answer + (set.size % 2 === 0 ? 1 : -1) + randInt(1, 9);
    if (d !== answer && d >= 0) set.add(d);
  }
  return Array.from(set).slice(0, 3);
}

const SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷' };

// 生成一个是链式的题：2步运算、3个操作数，保证中间结果非负、除法整除、结果非负
function makeChainQuestion(spec) {
  const { maxNum, minNum = 1, chain, type } = spec;
  // chain: 'addsub' | 'muldiv' | 'mixed'(四则连算)
  const isMulDiv = chain === 'muldiv';
  const isMixed = chain === 'mixed';
  let ops, a, b, c, mid, answer;
  let guard = 80;
  while (guard--) {
    if (isMixed) {
      // 四则连算：加减 与 乘除 混合，2步3个数，用括号标明先后
      const n = spec.maxNum ?? 12;
      const hiFirst = Math.random() < 0.5; // 先乘除部分，再加减部分
      if (hiFirst) {
        // ( a × b ) + c  或  ( a ÷ b ) + c ... a/b 是乘除组，c 是加减组
        const hi = Math.random() < 0.5 ? 'mul' : 'div';
        let lo = Math.random() < 0.5 ? 'add' : 'sub';
        let x, y, md;
        if (hi === 'mul') {
          x = randInt(1, n); y = randInt(1, n); md = x * y;
        } else {
          // a = q × b，商为 q（原取到的数），b 为乘数
          const q = randInt(1, n);
          const b_ = randInt(1, n);
          x = q * b_;
          y = b_;
          md = q;
        }
        const z = randInt(1, n);
        if (lo === 'add') { mid = md; answer = md + z; c = z; }
        else { mid = md; answer = md - z; if (answer < 0) { answer = md + z; lo = 'add'; } c = z; }
        a = x; b = y; ops = [hi, lo];
        // 存显示顺序：乘除部分加括号
      } else {
        // ( a + b ) × c  或  ( a − b ) × c
        const lo = Math.random() < 0.5 ? 'add' : 'sub';
        const hi = Math.random() < 0.5 ? 'mul' : 'div';
        let x, y, m;
        if (lo === 'add') { x = randInt(1, n); y = randInt(1, n); m = x + y; }
        else { x = randInt(2, n); y = randInt(1, x - 1); m = x - y; }
        if (hi === 'mul') {
          const z = Math.max(1, Math.min(n, Math.floor(60 / Math.max(1, m))));
          mid = m; answer = m * z; c = z;
        } else {
          const z = Math.max(1, Math.min(n, divisorsOf(m, 1, Math.min(n, m))[0] || 1));
          mid = m; answer = m / z; c = z;
        }
        a = x; b = y; ops = [lo, hi]; // 显示顺序：先括号组
      }
    } else if (isMulDiv) {
      // 数值范围：连乘连除用较小的数，结果一般较大；用 maxNum=20 够
      const n = spec.maxNum ?? 12;
      if (Math.random() < 0.5) {
        ops = ['mul', 'div'];
        a = randInt(2, n);
        b = randInt(2, n);
        const p = a * b;
        // 找一个整除 p 的除数
        const divisors = divisorsOf(p, 2, n);
        if (!divisors.length) continue;
        c = pick(divisors);
        mid = p;
        answer = mid / c;
      } else {
        ops = ['div', 'mul'];
        b = randInt(2, n);
        c = randInt(2, n);
        // a = b * q 使 a÷b 整除
        const q = randInt(Math.max(2, spec.minQ || 2), Math.max(2, spec.maxQ || n));
        a = b * q;
        mid = q;
        answer = q * c;
      }
    } else {
      // 连加连减：+、− 混合，保证中间与结果 >= 0
      ops = [pick(['add', 'sub']), pick(['add', 'sub'])];
      const n = spec.maxNum ?? 20;
      a = randInt(minNum, n);
      b = randInt(minNum, n);
      // 先定 a 和第一个运算，保证中间结果非负
      let m;
      if (ops[0] === 'sub') {
        if (a < b) continue;
        m = a - b;
      } else {
        m = a + b;
        if (m > n * 2) continue;
      }
      c = randInt(minNum, n);
      if (ops[1] === 'sub') {
        if (m < c) continue;
        mid = m;
        answer = m - c;
      } else {
        mid = m;
        answer = m + c;
      }
      a = a; b = b; c = c;
    }
    break;
  }
  if (!ops) ops = isMixed ? ['add', 'mul'] : isMulDiv ? ['mul', 'mul'] : ['add', 'add'];
  if (answer === undefined) {
    if (isMixed) { a = 3; b = 2; mid = 6; c = 4; answer = 10; ops = ['mul', 'add']; }
    else if (isMulDiv) { a = 3; b = 2; c = 2; answer = 3; ops = ['mul', 'div']; mid = 6; }
    else { a = 3; b = 2; answer = 1; mid = 5; ops = ['add', 'sub']; c = 4; }
  }
  const options = distractors(answer).sort(() => Math.random() - 0.5);
  // 混合连算加括号，让两段一目了然：如 ( 3 × 4 ) + 5
  const expr = isMixed
    ? `( ${a} ${SYMBOL[ops[0]]} ${b} ) ${SYMBOL[ops[1]]} ${c}`
    : `${a} ${SYMBOL[ops[0]]} ${b} ${SYMBOL[ops[1]]} ${c}`;
  return {
    chain: true,
    chainType: isMixed ? 'mixed' : isMulDiv ? 'muldiv' : 'addsub',
    a, b, c, mid,
    op: isMixed ? 'chainMixed' : isMulDiv ? 'chainMulDiv' : 'chainAddSub',
    symbol: '…',
    ops,
    answer,
    options,
    expression: expr,
    spec,
  };
}

function divisorsOf(n, min, max) {
  const d = [];
  for (let i = min; i <= Math.min(max, n); i++) if (n % i === 0) d.push(i);
  return d;
}

// 生成一题：spec + typeKey
export function makeQuestion(spec) {
  if (spec && spec.chain) {
    const q = makeChainQuestion(spec);
    return q;
  }
  let o;
  let guard = 40;
  do { o = genOperands(spec); guard--; } while (guard > 0 && !o.answer);
  const opDp = o.opDp ?? 0;
  const ansDp = o.ansDp ?? opDp;
  const aStr = fmtNum(o.a, opDp);
  const bStr = fmtNum(o.b, opDp);
  const ansStr = fmtNum(o.answer, ansDp);
  const options = distractors(o.answer).map((v) => fmtNum(v, ansDp)).sort(() => Math.random() - 0.5);
  return {
    a: o.a,
    b: o.b,
    op: spec.type,
    symbol: SYMBOL[spec.type] || spec.type,
    answer: ansStr,
    options,
    expression: `${aStr} ${SYMBOL[spec.type]} ${bStr}`,
  };
}

export function makeQuestionSet(specs, count, opts = {}) {
  const challengeRatio = opts.challengeRatio ?? 0.1;
  const set = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(specs);
    // 约 10% 的题上升一个档次（链式题跳过，避免升级逻辑破坏整除）
    const isChallenge =
      challengeRatio > 0 && Math.random() < challengeRatio && !spec.chain;
    const q = makeQuestion(isChallenge ? upgradeSpec(spec) : spec);
    set.push(isChallenge ? { ...q, challenge: true } : q);
  }
  return set;
}

// 把题目数字范围提升一个档次（更高难度）
export function upgradeSpec(spec) {
  const up = { ...spec };
  const boost = (v) => Math.max(2, Math.round(v * 1.6));
  if (spec.multiples10 || spec.multiples100) {
    const step = spec.multiples10 ? 10 : 100;
    up.aMin = spec.aMin;
    up.aMax = spec.aMax;
    up.bMin = spec.bMin;
    // 一整档提升：范围上限加一个步长以上的量
    up.bMax = spec.bMax + step * 2;
  } else {
    up.bMax = boost(spec.bMax);
    up.aMax = boost(spec.aMax);
    // 除法除数上限提升对应商数不受影响
  }
  // 乘法两个因子都提升
  if (spec.type === 'mul') {
    up.aMax = boost(spec.aMax);
    up.bMax = boost(spec.bMax);
  }
  return up;
}

// 由「错误题模板」重出同类题（换数字保留考点）
export function remakeQuestion(wrongTemplate) {
  const { spec, op } = wrongTemplate;
  const q = makeQuestion(spec);
  if (q.op !== op) q.op = op;
  return q;
}