import { useEffect } from 'react';
import { summarize, getErrorHint, fmtTime, getOpName } from '../lib/analytics';
import { Icon } from '../components/Icon';

// 本次答题结果
export default function ResultScreen({ session, user, onDone, onReviewWrong, onSetup }) {
  const sum = summarize(session.questions);

  useEffect(() => {
    if (!user) return;
    // 记录解锁进度
  }, [user]);

  return (
    <div className="page flat" style={{ paddingTop: 20 }}>
      {/* 分数大卡 */}
      <div className="result-hero">
        <div className="result-score">
          {sum.total ? Math.round((sum.correct / sum.total) * 100) : 0}
          <span className="pct">%</span>
        </div>
        <div className="result-stars">
          {sum.correctRate >= 90 ? '⭐⭐⭐ 真棒！' : sum.correctRate >= 60 ? '⭐⭐ 不错哦' : '⭐ 继续加油'}
        </div>
        <div className="result-stats">
          <Stat label="正确" value={sum.correct} color="good" />
          <Stat label="错误" value={sum.wrong} color="bad" />
          <Stat label="平均用时" value={fmtTime(sum.avgTime)} color="ink" />
        </div>
      </div>

      {/* 错误类型归纳 */}
      {sum.errors.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="group-label">错误类型归纳</div>
          {sum.errors.map((e) => (
            <div key={e.op} className="error-row">
              <div className="error-op">
                {getOpName(e.op)} 错误 {e.wrong} 题
              </div>
              <div className="error-rate">{e.rate}%</div>
            </div>
          ))}
          <div className="hint" style={{ marginTop: 10 }}>
            {getErrorHint(sum.errors[0]?.op)}
          </div>
        </div>
      )}

      <div className="spacer" />
      <button className="big-btn" onClick={onReviewWrong}>
        <Icon name="book" size={20} /> 复习错题
      </button>
      <div className="spacer" style={{ height: 12 }} />
      <button className="big-btn ghost" onClick={onSetup}>
        再练一次
      </button>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="stat">
      <div className={`stat-val ${color}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}