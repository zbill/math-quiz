import { useState } from 'react';
import { unlockStore, settingsStore } from '../lib/store';
import { Icon } from '../components/Icon';

const OPS_LABEL = { add: '加法', sub: '减法', mul: '乘法', div: '除法' };
const RATIO_LABEL = { 0: '全选项', 1: '50%手填', 2: '75%手填', 3: '全手填' };

export default function SettingsScreen({ user, unlockMap, onLogout, onRename }) {
  const [threshold, setThreshold] = useState(
    () => settingsStore.get().unlockThreshold || 90
  );
  const [perStage, setPerStage] = useState(
    () => settingsStore.get().unlockPerStage || 20
  );
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const saveThreshold = () => {
    settingsStore.set({ unlockThreshold: threshold, unlockPerStage: perStage });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="page">
      {/* 使用者 */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="group-label">当前使用者</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar">{user?.name?.[0] || '口'}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>本地档案 · 云端同步待接入</div>
          </div>
        </div>
      </div>

      {/* 分阶段解锁规则 */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="group-label">分阶段解锁设置</div>
        <div className="hint" style={{ marginBottom: 12 }}>
          每个题型：最近做满「每档题数」道，这 N 道正确率达到「达标正确率」就升一档；低于达标就降一档。档位越高手填越多，最后全手填。
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
          <label style={{ flex: 1 }}>
            <div className="hint" style={{ marginBottom: 4 }}>每档题数</div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={perStage}
              onChange={(e) => setPerStage(Math.max(1, Math.min(999, Number(e.target.value))))}
            />
          </label>
          <label style={{ flex: 1 }}>
            <div className="hint" style={{ marginBottom: 4 }}>达标正确率 %</div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(Math.min(100, Math.max(50, Number(e.target.value))))}
            />
          </label>
        </div>
        <button className="big-btn ghost" style={{ marginTop: 12 }} onClick={saveThreshold}>
          保存设置
        </button>
        {saved && <div className="hint" style={{ color: 'var(--good)', marginTop: 8 }}>已保存 ✓</div>}
      </div>

      {/* 分阶段解锁进度 */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="group-label">各题型解锁阶段</div>
        {Object.entries(OPS_LABEL).map(([op, label]) => {
          const st = unlockMap?.[op];
          const stage = st?.stage ?? 0;
          const recent = st?.recent || [];
          const need = perStage;
          const done = recent.length;
          const rate = recent.length
            ? Math.round((recent.reduce((s, v) => s + v, 0) / recent.length) * 100)
            : 0;
          return (
            <div key={op} className="unlock-row">
              <div className="op-name">{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span className="unlock-badge on">{RATIO_LABEL[stage]}</span>
                {stage < 3 ? (
                  <span className="unlock-progress">
                    本档 {done}/{need} 题 · 正确率 {rate}%
                  </span>
                ) : (
                  <span className="unlock-progress muted">已到最高档</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 关于 */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="group-label">关于</div>
        <div className="hint">
          口算挑战 · 本地版 v0.1。数据保存在本机浏览器中，后续版本将接入云端实现多端同步。
        </div>
        <button className="big-btn ghost" style={{ marginTop: 12 }} onClick={onLogout}>
          <Icon name="user" size={20} /> 切换使用者
        </button>
      </div>
    </div>
  );
}