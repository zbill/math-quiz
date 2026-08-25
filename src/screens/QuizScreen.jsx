import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';

export default function QuizScreen({ questions, settings, unlockRatio, onUnlock, onFinish, onExit }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('answering');
  const [selected, setSelected] = useState(null);
  const [inputStr, setInputStr] = useState('');
  const [inputMode, setInputMode] = useState(false); // 当前这题是否用手填数字键盘
  const [answered, setAnswered] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [total, setTotal] = useState(0);

  const timerRef = useRef(null);
  const startRef = useRef(Date.now());
  const answeredRef = useRef([]);
  const phaseRef = useRef('answering');
  phaseRef.current = phase;

  const timer = settings?.timer?.enabled ? settings.timer : null;

  // 初始化一题的作答状态、作答方式与倒计时
  useEffect(() => {
    startRef.current = Date.now();
    setSelected(null);
    setInputStr('');
    // 依据全局作答方式 + 当前题型的手填比例，随机决定此题用手填还是选择
    const mode = settings?.answerMode || 'auto';
    const ratio = Math.min(1, Math.max(0, unlockRatio(q().op) ?? 0));
    let input = false;
    if (mode === 'input') input = true;
    else if (mode === 'choice') input = false;
    else input = Math.random() < ratio; // auto：按阶段手填比例
    setInputMode(input);
    setPhase('answering');
    phaseRef.current = 'answering';
    if (timer) {
      setTimeLeft(timer.seconds);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => (t === null ? t : t - 1));
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // 倒计时归零 → 触发超时处理
  useEffect(() => {
    if (timer && timeLeft === 0 && phase === 'answering') {
      clearInterval(timerRef.current);
      onTimeoutRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // 超时：根据设置判定 记录时长 or 判错
  const onTimeout = () => {
    if (phaseRef.current !== 'answering') return;
    const judge = settings?.timer?.mode === 'judge';
    if (!judge) {
      // 仅记录时长，不判错：停留当前题继续作答，但停止倒计时
      clearInterval(timerRef.current);
      return;
    }
    const rec = makeRec(q(), null, 'timeout');
    pushRec(rec);
    onUnlock(q().op, false); // 超时判错，计入本轮但不计入正确
    setPhase('feedback');
    phaseRef.current = 'feedback';
    setSelected(null);
  };
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const q = () => questions[idx];
  const curRec = () => answered.find((a) => a.idx === idx)?.rec;
  const allowInput = inputMode;

  const makeRec = (qq, answer, kind) => ({
    ...qq,
    userAnswer: kind === 'timeout' ? null : answer,
    correct: kind === 'timeout' ? null : kind === 'correct' ? true : false,
    durationMs: Date.now() - startRef.current,
    timedOut: kind === 'timeout',
  });

  const pushRec = (rec) => {
    const qq = { idx, rec };
    answeredRef.current = [...answeredRef.current, qq];
    setAnswered(answeredRef.current);
  };

  const trySubmit = (answer) => {
    if (phase !== 'answering') return;
    clearInterval(timerRef.current);
    const kind = answer === q().answer ? 'correct' : 'wrong';
    const rec = makeRec(q(), answer, kind);
    setSelected(answer);
    pushRec(rec);
    onUnlock(q().op, kind === 'correct'); // 实时更新解锁进度，达准即升档
    setPhase('feedback');
    phaseRef.current = 'feedback';
    setTotal((v) => v + (kind === 'wrong' || kind === 'timeout' ? 0 : 1));
  };

  const checkInput = () => {
    if (inputStr === '' || phase !== 'answering') return;
    trySubmit(Number(inputStr));
  };

  const next = () => {
    if (idx + 1 >= questions.length) onFinish(answered, answeredRef.current);
    else setIdx((i) => i + 1);
  };

  const progress = (idx / questions.length) * 100;
  const rec = curRec();

  return (
    <div className="quiz-wrap" style={{ height: '100dvh' }}>
      {/* 顶栏 */}
      <div className="quiz-top">
        <button className="exit-btn" onClick={() => onFinish(answered, answeredRef.current, true)}>
          <Icon name="cross" size={18} />
        </button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="q-count">
          {idx + 1}/{questions.length}
        </div>
      </div>

      {timer && phase === 'answering' && (
        <div className={`timer ${timeLeft <= 5 ? 'danger' : ''}`}>
          <Icon name="clock" size={18} />
          <span>{timeLeft}s</span>
        </div>
      )}

      {/* 题目区 */}
      <div className="head-divide">
        <div className="expression">
          {q().expression}
        </div>
      </div>

      {/* 反馈条 */}
      {phase === 'feedback' && (
        <div className={`feedback-banner ${rec?.correct === true ? 'ok' : rec?.correct === false ? 'no' : 'miss'}`}>
          <Icon name={rec?.correct === true ? 'check' : 'cross'} size={20} />
          {rec?.correct === true ? '答对了！' : rec?.correct === false ? '答错了' : '超时了'}
        </div>
      )}

      {/* 答案区 */}
      {phase === 'answering' ? (
        allowInput ? (
          <div className="tail-divide keypad-area">
            <div className="input-display">{inputStr || '\u00a0'}</div>
            <div className="keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} className="num-key" onClick={() => setInputStr((p) => (p.length < 5 ? p + n : p))}>
                  {n}
                </button>
              ))}
              <button className="num-key" onClick={() => setInputStr((p) => p.slice(0, -1))}>⌫</button>
              <button className="num-key" onClick={() => setInputStr((p) => (p.length < 5 ? p + '0' : p))}>0</button>
              <button className="num-key" onClick={() => setInputStr('')}>清</button>
              <button className="num-key enter full" disabled={!inputStr} onClick={checkInput}>✓</button>
            </div>
          </div>
        ) : (
          <div className="tail-divide option-area">
            <div className="options">
              {q().options.map((op, i) => (
                <button
                  key={i}
                  className="option"
                  onClick={() => trySubmit(op)}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="tail-divide feedback-area">
          {rec?.correct === false ? (
            <div className="reveal wrong">
              <div className="reveal-label">正确答案</div>
              <div className="reveal-answer">{q().answer}</div>
            </div>
          ) : (
            <div className="reveal ok">
              <div className="reveal-answer big">{q().answer}</div>
              <div className="reveal-label">正确答案</div>
            </div>
          )}
          <button className="next-btn" onClick={next}>
            {idx + 1 >= questions.length ? '查看结果' : '下一题'}{' '}
            <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}