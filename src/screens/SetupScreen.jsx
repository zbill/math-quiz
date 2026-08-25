import { useState } from 'react';
import { getRules, GRADE_OPTIONS, SEMESTERS } from '../lib/gradeTemplates';
import { makeQuestionSet, upgradeSpec } from '../lib/questionEngine';
import { Icon } from '../components/Icon';

const COUNT_CHOICES = [10, 20, 30, 50];

const MODES = [
  { key: 'grade', label: '按年级', desc: '按教材难度自动出题' },
  { key: 'free', label: '自由组合', desc: '自选数字大小' },
];

// 运算类型（全局，两种模式共用）
const OP_GROUPS = [
  { key: 'all', symbol: '+−×÷', label: '加减乘除混合', ops: ['add', 'sub', 'mul', 'div'] },
  { key: 'add', symbol: '+', label: '纯加', ops: ['add'] },
  { key: 'sub', symbol: '−', label: '纯减', ops: ['sub'] },
  { key: 'mul', symbol: '×', label: '纯乘', ops: ['mul'] },
  { key: 'div', symbol: '÷', label: '纯除', ops: ['div'] },
  { key: 'addsub', symbol: '+−', label: '加减混合', ops: ['add', 'sub'] },
  { key: 'muldiv', symbol: '×÷', label: '乘除混合', ops: ['mul', 'div'] },
  { key: 'chainAddSub', symbol: '+−', label: '连加连减', chain: 'addsub' },
  { key: 'chainMulDiv', symbol: '×÷', label: '连乘连除', chain: 'muldiv' },
];

const CHAIN = {
  chainAddSub: { chain: 'addsub', maxNum: 20 },
  chainMulDiv: { chain: 'muldiv', maxNum: 12 },
};

export default function SetupScreen({ user, onStart, onNeedUser }) {
  const [mode, setMode] = useState('grade');
  const [grade, setGrade] = useState(1);
  const [semester, setSemester] = useState(1);
  const [count, setCount] = useState(10);

  // 运算类型（全局）
  const [opGroup, setOpGroup] = useState('all');
  const [customOps, setCustomOps] = useState([]);

  // 自由模式下数字范围
  const [rangeMin, setRangeMin] = useState(1);
  const [rangeMax, setRangeMax] = useState(20);

  // 计时与作答模式
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSecs, setTimerSecs] = useState(10);
  const [timerMode, setTimerMode] = useState('judge'); // judge | record
  const [answerMode, setAnswerMode] = useState('auto'); // auto(按阶段比例) | choice | input

  // 挑战模式：约10%题目难度上升一个档次
  const [challenge, setChallenge] = useState(false);

  const isCustom = opGroup === 'custom';

  const toggleCustomOp = (op) => {
    setCustomOps((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
  };

  const start = () => {
    if (!user) {
      onNeedUser();
      return;
    }
    let specs;
    let settings;

    // 实际使用的运算符
    let ops = isCustom ? customOps : OP_GROUPS.find((g) => g.key === opGroup)?.ops || [];

    // 链式运算（连加连减 / 连乘连除）：独立于年级规则与数字范围
    if (CHAIN[opGroup]) {
      const c = CHAIN[opGroup];
      specs = [{ ...c, _type: opGroup }];
      settings = { mode, ops: [opGroup], chain: c.chain, rangeMax: c.maxNum };
    } else if (mode === 'grade') {
      const rules = getRules(grade, semester);
      // 若选了具体类型（非 all），按运算过滤年级规则
      specs = (opGroup === 'all' ? rules : rules.filter((r) => ops.includes(r.type)))
        .map((r) => ({ ...r, _type: r.type }));
      if (!specs.length) {
        alert('该年级暂时没有你选的这类题，请换一种类型');
        return;
      }
      settings = { mode: 'grade', grade, semester, ops: opGroup === 'all' ? ['add', 'sub', 'mul', 'div'] : ops };
    } else {
      if (!ops.length) {
        alert('请至少选择一种运算');
        return;
      }
      // 自由模式：乘法/除法需保证结果可控，范围默认以加减为主；这里直接套用数字范围
      specs = ops.map((op) => ({
        type: op,
        aMin: rangeMin,
        aMax: rangeMax,
        bMin: rangeMin,
        bMax: rangeMax,
        _type: op,
      }));
      settings = { mode: 'free', ops, rangeMin, rangeMax };
    }

    const questions = makeQuestionSet(specs, count, {
      challengeRatio: challenge ? 0.1 : 0,
    }).map((q, i) => ({
      ...q,
      qid: `s${Date.now()}-${i}`,
      spec: q.challenge ? upgradeSpec(specs[i % specs.length]) : specs[i % specs.length],
    }));
    settings = {
      ...settings,
      timer: { enabled: timerEnabled, seconds: timerSecs, mode: timerMode },
      answerMode,
      challenge,
    };
    onStart(questions, settings);
  };

  return (
    <div className="page flat">
      {/* 出题模式 */}
      <div className="group-label">出题模式</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`mode-chip ${mode === m.key ? 'on' : ''}`}
            onClick={() => setMode(m.key)}
          >
            <div style={{ fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* 运算类型（全局） */}
      <div className="group-label">运算类型</div>
      <div className="chips" style={{ marginBottom: 18 }}>
        {OP_GROUPS.map((g) => (
          <button
            key={g.key}
            className={`chip ${opGroup === g.key ? 'on' : ''}`}
            onClick={() => setOpGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
        {mode === 'free' && (
          <button
            className={`chip ${isCustom ? 'on' : ''}`}
            onClick={() => setOpGroup('custom')}
          >
            自定义
          </button>
        )}
      </div>

      {isCustom && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="group-label">自定义运算（可多选）</div>
          <div className="chips">
            {['add', 'sub', 'mul', 'div'].map((op) => {
              const s = { add: '+', sub: '−', mul: '×', div: '÷' }[op];
              return (
                <button
                  key={op}
                  className={`chip ${customOps.includes(op) ? 'on' : ''}`}
                  onClick={() => toggleCustomOp(op)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 年级模式 */}
      {mode === 'grade' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="group-label">选择年级</div>
          <div className="chips">
            {GRADE_OPTIONS.map((g) => (
              <button
                key={g.value}
                className={`chip ${grade === g.value ? 'on' : ''}`}
                onClick={() => setGrade(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="spacer" style={{ height: 12 }} />
          <div className="group-label">选择学期</div>
          <div className="chips">
            {SEMESTERS.map((s) => (
              <button
                key={s.value}
                className={`chip ${semester === s.value ? 'on' : ''}`}
                onClick={() => setSemester(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="spacer" style={{ height: 12 }} />
          <div className="hint">
            将按{grade}年级{semester === 1 ? '上' : '下'}学期的标准数概念出题
          </div>
        </div>
      )}

      {/* 自由模式数字范围 */}
      {mode === 'free' && !isCustom && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="group-label">数字范围</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={rangeMin}
              onChange={(e) => setRangeMin(Math.max(0, Number(e.target.value)))}
            />
            <span style={{ color: 'var(--ink-2)' }}>～</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={rangeMax}
              onChange={(e) => setRangeMax(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            用于运算的两个数字都会在所选范围内取。
          </div>
        </div>
      )}

      {/* 答题数量 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="group-label">答题数量</div>
        <div className="chips">
          {COUNT_CHOICES.map((c) => (
            <button
              key={c}
              className={`chip ${count === c ? 'on' : ''}`}
              onClick={() => setCount(c)}
            >
              {c}题
            </button>
          ))}
        </div>
      </div>

      {/* 计时设置 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="group-label" style={{ margin: 0 }}>倒计时限时</div>
          <button
            className={`switch ${timerEnabled ? 'on' : ''}`}
            onClick={() => setTimerEnabled((v) => !v)}
          >
            <span className="knob" />
          </button>
        </div>
        {timerEnabled && (
          <>
            <div className="spacer" style={{ height: 14 }} />
            <div className="group-label">每题时长</div>
            <div className="chips">
              {[5, 10, 15, 20, 30].map((s) => (
                <button
                  key={s}
                  className={`chip ${timerSecs === s ? 'on' : ''}`}
                  onClick={() => setTimerSecs(s)}
                >
                  {s}秒
                </button>
              ))}
            </div>
            <div className="spacer" style={{ height: 14 }} />
            <div className="group-label">超时处理</div>
            <div className="chips">
              <button
                className={`chip ${timerMode === 'judge' ? 'on' : ''}`}
                onClick={() => setTimerMode('judge')}
              >
                直接判错
              </button>
              <button
                className={`chip ${timerMode === 'record' ? 'on' : ''}`}
                onClick={() => setTimerMode('record')}
              >
                只记时长不判错
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700 }}>挑战模式</div>
            <div className="hint" style={{ marginTop: 4 }}>
              约10%的题目数字范围会上升一个档次，更有挑战
            </div>
          </div>
          <button
            className={`switch ${challenge ? 'on' : ''}`}
            onClick={() => setChallenge((v) => !v)}
          >
            <span className="knob" />
          </button>
        </div>
      </div>

      <button className="big-btn" onClick={start}>
        <Icon name="bolt" size={20} /> 开始答题
      </button>
    </div>
  );
}