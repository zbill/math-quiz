// 云同步层（方式B：按用户分文档，多端互通、用户隔离）。
// 云端文档：
//   - `users`    ：所有用户档案（登录页列出全部使用者）
//   - `u_<uid>`  ：当前用户数据（答题/错题/统计/解锁/设置）
// 策略：
//   - 登录/返回时 syncPull(userId)：拉取用户档案 + 当前用户数据（远端优先）
//   - 答题结束/保存/退出时 syncPush(userId)：推送用户档案 + 当前用户数据
// 任意一次失败都静默回退（本地模式不受影响）。
import { apiFns, cloudEnabled } from './api';
import {
  dumpProfiles,
  loadProfiles,
  dumpUserState,
  loadUserState,
} from './store';

const PROFILE_DOC = '/users';
let busy = false;

export async function syncPull(userId) {
  if (!cloudEnabled() || busy) return false;
  busy = true;
  try {
    // 用户档案：登录页需要列出全部使用者
    const profiles = await apiFns(PROFILE_DOC, { method: 'GET' });
    if (profiles && Array.isArray(profiles.users)) loadProfiles(profiles.users);
    // 当前用户数据
    if (userId) {
      const data = await apiFns(`/u_${userId}`, { method: 'GET' });
      if (data) loadUserState(userId, data);
    }
    return true;
  } catch (e) {
    console.warn('云拉取失败(忽略)', e);
    return false;
  } finally {
    busy = false;
  }
}

export async function syncPush(userId) {
  if (!cloudEnabled() || busy) return false;
  busy = true;
  try {
    await apiFns(PROFILE_DOC, { method: 'PUT', body: { users: dumpProfiles() } });
    if (userId) {
      await apiFns(`/u_${userId}`, { method: 'PUT', body: dumpUserState(userId) });
    }
    return true;
  } catch (e) {
    console.warn('云推送失败(忽略)', e);
    return false;
  } finally {
    busy = false;
  }
}