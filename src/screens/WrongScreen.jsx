import { useState } from 'react';
import { wrongStore } from '../lib/store';
import { remakeQuestion } from '../lib/questionEngine';
import { Icon } from '../components/Icon';

export default function WrongScreen({ user }) {
  const [wrongs, setWrongs] = useState(() => wrongStore.byUser(user?.id));
  const [mode, setMode] = useState('list'); // list | practice
  const [practice, setPractice] = useState(null); // { index, questions, results }

  const refresh = () => setWrongs(wrongStore.byUser(user?.id));

  const startPractice = () => {
    if (!wrongs.length) return;
    // 从错题模板重出类似题（换数字）
    const questions = wrongs.map((w, i) => ({
      ...remakeQuestion({ spec: normalizeSpec(w), op: w.op }),
      qid: `p${Date.now()}-${i}`,
    }));
    setPractice({ index: 0, questions, results: [] });
    setMode('practice');
  };

  const normalizeSpec = (w) =>
    w.spec ||
    (w.chain
      ? {
          chain: w.chainType === 'muldiv' ? 'muldiv' : 'addsub',
          maxNum: w.chainType === 'muldiv' ? 12 : 20,
        }
      : {
          type: w.op,
          aMin: w.op === 'mul' ? 2 : 1,
          aMax: w.op === 'mul' ? 9 : 20,
          bMin: w.op === 'div' ? 2 : 1,
          bMax: w.op === 'div' ? 9 : 20,
        });

  if (mode === 'practice') return <Practice practice={practice} setPractice={setPractice} onExit={() => setMode('list')} />;

  return (
    <div className="page">
      {wrongs.length ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="group-label">错题本（{wrongs.length} 道）</div>
            {wrongs.map((w) => (
              <div key={w.qid} className="wrong-item">
                <div className="wrong-expr">
                  {w.expression || `${w.a} ${w.symbol} ${w.b}`} = <b>{w.answer}</b>
                </div>
                <div className="wrong-wrong">错 {w.wrongCount} 次</div>
              </div>
            ))}
          </div>
          <div className="spacer" />
          <button className="big-btn" onClick={startPractice}>
            <Icon name="refresh" size={20} /> 只练错题（出类似题）
          </button>
        </>
      ) : (
        <div className="empty-state">
          <Icon name="check" size={40} />
          <div style={{ marginTop: 10, color: 'var(--ink-2)' }}>没有错题，继续保持！</div>
        </div>
      )}
    </div>
  );
}

// 错题练习（选择模式）
function Practice({ practice, setPractice, onExit }) {
  const { index, questions, results } = practice;
  const q = questions[index];
  const [feedback, setFeedback] = useState(null);

  const answer = (op) => {
    if (feedback) return;
    const correct = op === q.answer;
    setFeedback({ op, correct });
  };

  const next = () => {
    const newResults = [...results, { q, correct: feedback.correct }];
    if (index + 1 >= questions.length) {
      setPractice({ ...practice, results: newResults, done: true });
      setFeedback(null);
    } else {
      setPractice({ ...practice, index: index + 1, results: newResults });
      setFeedback(null);
    }
  };

  if (practice.done) {
    const correct = results.filter((r) => r.correct).length;
    const allClear = correct === questions.length;
    return (
      <div className="page flat" style={{ paddingTop: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name={allClear ? 'trophy' : 'target'} size={56} />
          <div style={{ fontWeight: 800, fontSize: 22, marginTop: 16 }}>
            {allClear ? '全部答对！错题攻克！' : `完成！答对 ${correct}/${questions.length}`}
          </div>
        </div>
        <div className="spacer" />
        {allClear && (
          <div className="card">
            <div className="group-label">恭喜</div>
            <div className="hint">这些错题你已经掌握，将从错题本中清除。</div>
          </div>
        )}
        <div className="spacer" />
        <button className="big-btn" onClick={onExit}>返回错题本</button>
      </div>
    );
  }

  return (
    <div className="quiz-wrap" style={{ height: '100dvh' }}>
      <div className="quiz-top">
        <button className="exit-btn" onClick={onExit}><Icon name="cross" size={18} /></button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <div className="q-count">{index + 1}/{questions.length}</div>
      </div>

      <div className="head-divide">
        <div className="expression">
          {q.expression} <span className="eq">= ?</span>
        </div>
      </div>

      <div className="tail-divide option-area">
        <div className="options">
          {q.options.map((op, i) => (
            <button
              key={i}
              className={`option ${feedback ? (op === q.answer ? 'right' : op === feedback.op ? 'wrong' : 'dim') : ''}`}
              disabled={!!feedback}
              onClick={() => answer(op)}
            >
              {op}
            </button>
          ))}
        </div>
        {feedback && (
          <button className="next-btn" onClick={next}>
            {index + 1 >= questions.length ? '完成' : '下一题'} <Icon name="chevron" size={16} />
          </button>
        )}
        {feedback && !feedback.correct && (
          <div className="correction">
            <div className="reveal-label">正确答案：{q.answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}