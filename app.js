(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const els = {
    video: $('#video'),
    inputUrl: $('#inputUrl'),
    btnPlay: $('#btnPlay'),
    btnSave: $('#btnSave'),
    btnReset: $('#btnReset'),
    btnForceRefresh: $('#btnForceRefresh'),
    pollMs: $('#pollMs'),
    autoTrack: $('#autoTrack'),
    status: $('#status'),
  };

  const CFG_KEY = 'np_config_v1';
  let hls = null;
  let currentUrl = '';
  let pollTimer = null;

  function logStatus(msg) {
    const ts = new Date().toLocaleTimeString();
    els.status.textContent = `[${ts}] ${msg}`;
    console.log('[status]', msg);
  }

  function readLocalConfig() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('local cfg parse', e);
      return {};
    }
  }
  function writeLocalConfig(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }
  function getCfg() {
    const base = window.PLAYER_CONFIG || {};
    const loc = readLocalConfig();
    return Object.assign({}, base, loc);
  }

  function applyUIFromCfg() {
    const cfg = getCfg();
    els.pollMs.value = String(cfg.POLL_MS || 20000);
    els.autoTrack.checked = !!cfg.AUTO_TRACK;
    if (cfg.DEFAULT_M3U8) {
      els.inputUrl.placeholder = cfg.DEFAULT_M3U8;
    }
  }

  function saveUIToCfg() {
    const cfg = getCfg();
    const poll = parseInt(els.pollMs.value, 10);
    const merged = {
      ...cfg,
      POLL_MS: Number.isFinite(poll) && poll >= 5000 ? poll : cfg.POLL_MS,
      AUTO_TRACK: !!els.autoTrack.checked,
    };
    writeLocalConfig(merged);
    logStatus('Configuration locale enregistrée.');
    restartWatcher();
  }

  function resetCfg() {
    localStorage.removeItem(CFG_KEY);
    applyUIFromCfg();
    logStatus('Configuration réinitialisée (localStorage vidé).');
    restartWatcher();
  }

  function ensureHls() {
    if (hls) return hls;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.attachMedia(els.video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS error', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hls = null;
              break;
          }
        }
      });
      return hls;
    } else if (els.video.canPlayType('application/vnd.apple.mpegurl')) {
      return null; // Safari natif
    } else {
      throw new Error('HLS non supporté par ce navigateur.');
    }
  }

  async function loadUrl(url) {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === currentUrl) return;

    currentUrl = trimmed;
    try {
      const inst = ensureHls();
      logStatus('Chargement: ' + trimmed);
      if (inst) {
        inst.loadSource(trimmed);
      } else {
        els.video.src = trimmed;
      }
      await els.video.play().catch(()=>{});
    } catch (e) {
      console.error('loadUrl error', e);
      logStatus('Erreur de lecture: ' + e.message);
    }
  }

  async function fetchLatestJson() {
    const cfg = getCfg();
    const path = (cfg.DATA_PATH || 'data/latest.json') + '?t=' + Date.now();
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const js = await res.json();
    if (js && js.m3u8) return String(js.m3u8);
    throw new Error('latest.json sans champ "m3u8"');
  }

  async function tick() {
    const cfg = getCfg();
    if (!cfg.AUTO_TRACK) return;
    try {
      const next = await fetchLatestJson();
      if (next && next !== currentUrl) {
        await loadUrl(next);
        logStatus('URL mise à jour via latest.json');
      } else {
        logStatus('Aucun changement détecté.');
      }
    } catch (e) {
      logStatus('Watch: ' + e.message);
    }
  }

  function restartWatcher() {
    if (pollTimer) clearInterval(pollTimer);
    const cfg = getCfg();
    if (cfg.AUTO_TRACK) {
      pollTimer = setInterval(tick, Math.max(5000, cfg.POLL_MS || 20000));
    }
  }

  // UI events
  els.btnPlay.addEventListener('click', () => {
    const val = els.inputUrl.value.trim();
    loadUrl(val || els.inputUrl.placeholder || '');
  });
  els.inputUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.btnPlay.click();
  });
  els.btnSave.addEventListener('click', saveUIToCfg);
  els.btnReset.addEventListener('click', resetCfg);
  els.btnForceRefresh.addEventListener('click', tick);

  // Boot
  window.addEventListener('DOMContentLoaded', async () => {
    applyUIFromCfg();
    const cfg = getCfg();
    // 1) Essaie latest.json
    try {
      const initUrl = await fetchLatestJson();
      await loadUrl(initUrl);
      logStatus('Démarrage depuis latest.json');
    } catch {
      // 2) Secours: DEFAULT_M3U8 ou placeholder
      const fallback = cfg.DEFAULT_M3U8 || '';
      if (fallback) {
        await loadUrl(fallback);
        logStatus('Démarrage via DEFAULT_M3U8');
      } else {
        logStatus('En attente d’une URL (saisis-en une ci-dessus).');
      }
    }
    restartWatcher();
  });
})();