import { useState, useEffect } from 'react';
import {
  userStore,
  sessionStore,
  recordStore,
  wrongStore,
  unlockStore,
  settingsStore,
} from './lib/store';
import { buildSessionRecord, summarize } from './lib/analytics';
import { syncPull, syncPush } from './lib/cloud';
import { Icon } from './components/Icon';
import LoginScreen from './screens/LoginScreen';
import SetupScreen from './screens/SetupScreen';
import QuizScreen from './screens/QuizScreen';
import ResultScreen from './screens/ResultScreen';
import StatsScreen from './screens/StatsScreen';
import WrongScreen from './screens/WrongScreen';
import SettingsScreen from './screens/SettingsScreen';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => {
    const active = sessionStore.active();
    if (!active) return null;
    const u = userStore.get(active.userId);
    // 只对已设密码的账号恢复会话，避免空密码绕过登录
    return u && u.pin ? u : null;
  });
  const [tab, setTab] = useState('setup'); // setup | quiz | result | stats | wrong | settings | login
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState(null);
  const [unlockMap, setUnlockMap] = useState(() =>
    user ? unlockStore.all(user.id) : {}
  );

  // 打开应用时若有会话，先拉取云端最新状态再刷新界面
  useEffect(() => {
    if (!user) return;
    syncPull().then(() => {
      const u = userStore.get(user.id);
      if (u) setUser(u);
      setUnlockMap(unlockStore.all(user.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (id) => {
    sessionStore.login(id);
    // 登录时先拉云端最新状态，覆盖本地
    await syncPull();
    const u = userStore.get(id);
    setUser(u);
    setUnlockMap(unlockStore.all(id));
    setTab('setup');
  };

  const logout = () => {
    syncPush(); // 退出前推送最新状态到云端
    sessionStore.logout();
    setUser(null);
    setTab('login');
  };

  // 开始答题
  const start = (questions, s) => {
    setSettings(s);
    setSession({ questions, settings: s });
    setTab('quiz');
  };

  // 每答完一题就更新解锁进度：最近 N 道正确率达标则升档，低于达标则降档（同场即可看到档位变化）
  const onUnlock = (op, correct) => {
    if (!op || !user) return;
    const settings = settingsStore.get();
    const need = settings.unlockPerStage || 20;
    const threshold = (settings.unlockThreshold || 90) / 100;
    const st = unlockStore.record(user.id, op, correct, need);
    if (st.recent.length >= need) {
      const correctCount = st.recent.reduce((s, v) => s + v, 0);
      const rate = correctCount / need;
      if (st.stage < 3 && rate >= threshold) unlockStore.advance(user.id, op);
      else if (st.stage > 0 && rate < threshold) unlockStore.downgrade(user.id, op);
    }
    setUnlockMap(unlockStore.all(user.id));
  };

  // 答题完成
  const finish = (answered, answeredRef, early = false) => {
    const qs = (answeredRef || answered).map(({ idx, rec }) => {
      const q = session.questions[idx];
      return { ...q, ...rec };
    });
    const sessionId = `u${Date.now()}`;
    const rec = buildSessionRecord({
      userId: user.id,
      sessionId,
      questions: qs,
      settings: session.settings,
    });
    recordStore.add(rec);

    // 更新错题本
    const date = rec.date;
    qs.forEach((q) => {
      if (!q.op) return;
      wrongStore.track(user.id, q, q.correct, date);
    });

    // 关键：把合并了作答数据的题目写回 session，供结果页正确统计
    setSession({
      ...session,
      questions: qs,
      questionsOriginal: session.questions,
      saved: true,
      completed: true,
    });
    // 点叉中途退出(early)时，回到出题页而不是进结果页
    setTab(early ? 'setup' : 'result');
    syncPush(); // 答题结束，推送最新成绩/解锁进度到云端
  };

  const reviewWrong = () => {
    setTab('wrong');
  };

  // 底部导航
  const tabs = [
    { key: 'setup', label: '出题', icon: 'home' },
    { key: 'stats', label: '统计', icon: 'chart' },
    { key: 'wrong', label: '错题', icon: 'book' },
    { key: 'settings', label: '设置', icon: 'user' },
  ];

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="app-shell">
      {tab === 'quiz' ? (
        <>
          <div className="topbar hide-desktop">
            <div className="title">口算挑战</div>
            <div className="user">{user.name}</div>
          </div>
          <QuizScreen
            questions={session.questions}
            settings={session.settings}
            unlockRatio={(op) => unlockStore.ratio(user.id, op)}
            onUnlock={onUnlock}
            onFinish={finish}
            onExit={() => setTab('setup')}
          />
        </>
      ) : tab === 'result' ? (
        <div className="page-with-bar">
          <div className="topbar">
            <div className="title">答题结果</div>
            <div className="user">{user.name}</div>
          </div>
          <ResultScreen
            session={session}
            user={user}
            onDone={() => setTab('setup')}
            onReviewWrong={reviewWrong}
            onSetup={() => setTab('setup')}
          />
          <Tabbar tabs={tabs} active="setup" onTab={setTab} />
        </div>
      ) : (
        <div className="page-with-bar">
          <div className="topbar">
            <div className="title">
              {tab === 'stats' ? '统计' : tab === 'wrong' ? '错题' : tab === 'settings' ? '设置' : '口算挑战'}
            </div>
            <div className="user">{user.name}</div>
          </div>
          <div className="content-area">
            {tab === 'setup' && <SetupScreen user={user} onStart={start} onNeedUser={() => {}} />}
            {tab === 'stats' && <StatsScreen user={user} goPractice={() => setTab('setup')} />}
            {tab === 'wrong' && <WrongScreen user={user} />}
            {tab === 'settings' && (
              <SettingsScreen
                user={user}
                unlockMap={unlockMap}
                onLogout={logout}
                onRename={() => {}}
              />
            )}
          </div>
          <Tabbar tabs={tabs} active={tab} onTab={setTab} />
        </div>
      )}
    </div>
  );
}

function Tabbar({ tabs, active, onTab }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.key} className={active === t.key ? 'active' : ''} onClick={() => onTab(t.key)}>
          <Icon name={t.icon} size={22} className="ico" />
          {t.label}
        </button>
      ))}
    </nav>
  );
}