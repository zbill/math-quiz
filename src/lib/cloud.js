// 云同步层：把整份应用状态存为云端一个 JSON 文档，实现多端同步。
// 策略：
//   - 登录/返回时 syncPull()：拉取云端最新状态覆盖本地（远端优先）
//   - 答题结束/保存/退出时 syncPush()：把本地最新状态推送到云端（近端写覆盖）
// 任意一次失败都静默回退（本地模式不受影响）。
import { apiFns, cloudEnabled } from './api';
import { dumpState, loadState } from './store';

const DOC_PATH = '/state';
let busy = false;

export async function syncPull() {
  if (!cloudEnabled() || busy) return false;
  busy = true;
  try {
    const data = await apiFns(DOC_PATH, { method: 'GET' });
    if (!data) return false;
    loadState(data);
    return true;
  } catch (e) {
    console.warn('云拉取失败(忽略)', e);
    return false;
  } finally {
    busy = false;
  }
}

export async function syncPush() {
  if (!cloudEnabled() || busy) return false;
  busy = true;
  try {
    await apiFns(DOC_PATH, { method: 'PUT', body: dumpState() });
    return true;
  } catch (e) {
    console.warn('云推送失败(忽略)', e);
    return false;
  } finally {
    busy = false;
  }
}