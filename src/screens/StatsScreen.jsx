import { useState } from 'react';
import { recordStore, statsDailyStore, wrongStore } from '../lib/store';
import { summarize, fmtDate, fmtTime, getGuide, getOpName } from '../lib/analytics';
import { Icon } from '../components/Icon';

export default function StatsScreen({ user, goPractice }) {
  const [tab, setTab] = useState('today'); // today | history
  const records = recordStore.byUser(user?.id).sort((a, b) => b.end.localeCompare(a.end));
  const todayStr = fmtDate(new Date());
  const todayRecords = records.filter((r) => r.date === todayStr);

  const agg = (list) => {
    const qs = list.flatMap((r) => r.questions || []);
    if (!qs.length) return null;
    return summarize(qs);
  };
  const todaySum = agg(todayRecords);
  const allSum = agg(records);

  // 历史按天聚合
  const byDay = {};
  records.forEach((r) => {
    if (!byDay[r.date]) byDay[r.date] = [];
    byDay[r.date].push(r);
  });
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
          今日
        </button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
          历史
        </button>
      </div>

      {tab === 'today' ? (
        <TodayPanel sum={todaySum} todayRecords={todayRecords} user={user} goPractice={goPractice} />
      ) : (
        <HistoryPanel days={days} allSum={allSum} />
      )}
    </div>
  );
}

function TodayPanel({ sum, todayRecords, user, goPractice }) {
  const wrongs = wrongStore.byUser(user?.id).filter((w) => isToday(w.lastWrongAt));
  return (
    <div>
      {sum ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="group-label">今日汇总</div>
            <div className="kv-grid">
              <Kv k="答题数" v={sum.total} />
              <Kv k="正确率" v={`${sum.correctRate}%`} />
              <Kv k="答对" v={sum.correct} c="good" />
              <Kv k="答错" v={sum.wrong} c="bad" />
              <Kv k="平均用时" v={fmtTime(sum.avgTime)} />
              <Kv k="场次" v={todayRecords.length} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="group-label">今日各题型表现</div>
            {sum.byOp && Object.entries(sum.byOp).length > 0 ? (
              Object.entries(sum.byOp).map(([op, v]) => (
                <div key={op} className="op-perf">
                  <div className="op-name">{getOpName(op)}</div>
                  <div className="op-bar">
                    <div
                      className="op-fill"
                      style={{ width: `${v.total ? (v.total - v.wrong) / v.total * 100 : 0}%` }}
                    />
                  </div>
                  <div className="op-rate">
                    {v.total ? Math.round(((v.total - v.wrong) / v.total) * 100) : 0}%
                  </div>
                </div>
              ))
            ) : (
              <div className="hint">今日还没有完成答题</div>
            )}
          </div>

          {wrongs.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="group-label">方法指导</div>
              <div className="hint" style={{ lineHeight: 1.7 }}>
                {getGuide(wrongs[0]?.op)}
              </div>
            </div>
          )}

          <div className="spacer" />
          <button className="big-btn" onClick={goPractice}>
            <Icon name="bolt" size={20} /> 去练习
          </button>
        </>
      ) : (
        <Empty goPractice={goPractice} />
      )}
    </div>
  );
}

function HistoryPanel({ days, allSum }) {
  return (
    <div>
      {days.length ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="group-label">全部累计</div>
            {allSum && (
              <div className="kv-grid">
                <Kv k="累计题数" v={allSum.total} />
                <Kv k="总正确率" v={`${allSum.correctRate}%`} />
                <Kv k="答对" v={allSum.correct} c="good" />
                <Kv k="答错" v={allSum.wrong} c="bad" />
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <div className="group-label">历史记录</div>
            {days.map(([date, list]) => {
              const s = summarize(list.flatMap((r) => r.questions));
              return (
                <div key={date} className="day-row">
                  <div>
                    <div className="day-date">{date}</div>
                    <div className="day-sub">
                      {list.length}场 · {s.total}题
                    </div>
                  </div>
                  <div className="day-rate">{s.correctRate}%</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Empty />
      )}
    </div>
  );
}

function Empty({ goPractice }) {
  return (
    <div className="empty-state">
      <Icon name="chart" size={40} />
      <div style={{ marginTop: 10, color: 'var(--ink-2)' }}>还没有答题记录</div>
      {goPractice && (
        <button className="big-btn" style={{ marginTop: 20 }} onClick={goPractice}>
          去练习
        </button>
      )}
    </div>
  );
}

function Kv({ k, v, c }) {
  return (
    <div className="kv">
      <div className="kv-k">{k}</div>
      <div className={`kv-v ${c || ''}`}>{v}</div>
    </div>
  );
}

function isToday(ts) {
  return fmtDate(new Date(ts)) === fmtDate(new Date());
}