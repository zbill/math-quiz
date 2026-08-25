import { useState } from 'react';
import { userStore } from '../lib/store';
import { Icon } from '../components/Icon';

export default function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState(userStore.list());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  // 选择使用者后确认密码
  const [selUser, setSelUser] = useState(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const refresh = () => setUsers(userStore.list());

  // 新建使用者：密码必填
  const create = () => {
    const n = name.trim();
    const p = pin.trim();
    if (!n) {
      setErr('请输入昵称');
      return;
    }
    if (!p) {
      setErr('请设置进入密码，不能为空');
      return;
    }
    const user = userStore.create({ name: n, pin: p });
    setUsers(userStore.list());
    setCreating(false);
    setName('');
    setPin('');
    onLogin(user.id);
  };

  // 点击使用者 → 进入密码确认
  const pickUser = (u) => {
    setSelUser(u);
    setLoginPin('');
    setLoginErr('');
  };

  const submitLogin = () => {
    if (!selUser) return;
    const p = loginPin.trim();
    if (!p) {
      setLoginErr('请输入进入密码');
      return;
    }
    // 历史账号未设密码：用本次输入的密码补设，之后以此密码进入
    if (!selUser.pin) {
      const saved = userStore.get(selUser.id);
      userStore.save({ ...saved, pin: p });
      onLogin(selUser.id);
      return;
    }
    if (p !== selUser.pin) {
      setLoginErr('密码不正确');
      return;
    }
    onLogin(selUser.id);
  };

  const back = () => {
    setSelUser(null);
    setCreating(false);
  };

  return (
    <div className="page flat" style={{ paddingTop: 40 }}>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Icon name="target" size={56} />
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>口算挑战</div>
        <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>选一位小朋友开始吧</div>
      </div>

      {selUser ? (
        // 密码确认
        <div className="card">
          <div className="group-label">进入「{selUser.name}」</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="password"
              placeholder="请输入进入密码"
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value)}
            />
            {loginErr && <div style={{ color: 'var(--bad)', fontSize: 13 }}>{loginErr}</div>}
            <button className="big-btn" onClick={submitLogin}>进入</button>
            <button className="link-btn" onClick={back}>返回</button>
          </div>
        </div>
      ) : !creating ? (
        <>
          {users.length > 0 && (
            <div className="card">
              <div className="group-label">选择使用人</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {users.map((u) => (
                  <button
                    key={u.id}
                    className="row-btn"
                    onClick={() => pickUser(u)}
                  >
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="spacer" />
          <button className="big-btn ghost" onClick={() => setCreating(true)}>
            ＋ 新增使用者
          </button>
        </>
      ) : (
        <div className="card">
          <div className="group-label">新增使用者</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              placeholder="昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="进入密码（必填）"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {err && <div style={{ color: 'var(--bad)', fontSize: 13 }}>{err}</div>}
            <button className="big-btn" onClick={create}>
              创建并进入
            </button>
            <button className="link-btn" onClick={back}>返回</button>
          </div>
        </div>
      )}
    </div>
  );
}