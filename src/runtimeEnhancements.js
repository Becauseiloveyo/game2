const HUD_ID = 'crystal-link-hud';
const SAFE_CLICK_MS = 260;
const BACKUP_KEY = 'crystal_link_runtime_backup';

const importantStorageKeys = [
  'crystal_link_local_db',
  'crystal_link_session',
  'crystal-link-game'
];

function ensureHud() {
  if (typeof document === 'undefined') return null;
  let hud = document.getElementById(HUD_ID);
  if (!hud) {
    hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.className = 'crystal-link-hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    document.body.appendChild(hud);
  }
  return hud;
}

function showHud(message, duration = 1200) {
  const hud = ensureHud();
  if (!hud) return;
  hud.textContent = message;
  hud.classList.add('is-visible');
  window.clearTimeout(showHud.hideTimer);
  showHud.hideTimer = window.setTimeout(() => hud.classList.remove('is-visible'), duration);
}

function installSafeClickGuard() {
  const lastClickByButton = new WeakMap();

  document.addEventListener(
    'click',
    (event) => {
      const button = event.target?.closest?.('button');
      if (!button || button.disabled || button.dataset.safeClick === 'off') return;

      const now = performance.now();
      const lastClickAt = lastClickByButton.get(button) || 0;
      if (now - lastClickAt < SAFE_CLICK_MS) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showHud('操作过快，已防止重复触发');
        return;
      }

      lastClickByButton.set(button, now);
      button.classList.add('crystal-link-safe-click');
      window.setTimeout(() => button.classList.remove('crystal-link-safe-click'), SAFE_CLICK_MS);
    },
    true
  );
}

function backupLocalProgress() {
  if (typeof localStorage === 'undefined') return;

  const snapshot = importantStorageKeys.reduce((backup, key) => {
    const value = localStorage.getItem(key);
    if (value !== null) backup[key] = value;
    return backup;
  }, {});

  if (Object.keys(snapshot).length > 0) {
    localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), data: snapshot })
    );
  }
}

function installProgressBackup() {
  window.addEventListener('pagehide', backupLocalProgress);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') backupLocalProgress();
  });
}

function installKeyboardHints() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== '?' || event.repeat) return;
    showHud('提示：点击相邻宝石交换；连锁越高，得分倍率越高', 1800);
  });
}

function installViewportFix() {
  const syncViewportHeight = () => {
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
  };
  syncViewportHeight();
  window.addEventListener('resize', syncViewportHeight, { passive: true });
  window.addEventListener('orientationchange', syncViewportHeight, { passive: true });
}

function bootRuntimeEnhancements() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  document.body.classList.add('crystal-link-enhanced');
  ensureHud();
  installSafeClickGuard();
  installProgressBackup();
  installKeyboardHints();
  installViewportFix();
}

bootRuntimeEnhancements();
