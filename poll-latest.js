/* Poll `data/latest.json` et injecte dans le player. Pas de CORS hack, pas d’URL absolue imposée. */
(() => {
  const playerEl = document.getElementById('player');
  const inputEl  = document.getElementById('m3u8Input');
  const statusEl = document.getElementById('status');
  const autoEl   = document.getElementById('autoFollow');
  const controls = document.getElementById('controls');
  const hotzone  = document.getElementById('hotzone');

  const POLL_MS = 15000;              // cadence de vérification
  const LATEST_URL = 'data/latest.json';

  let currentUrl = null;
  let hls = null;
  let pollTimer = null;
  let hideTimer = null;

  // --- UI: barre de contrôle masquée/visible au survol en haut
  function showControlsBriefly() {
    controls.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => controls.classList.remove('show'), 2000);
  }
  hotzone.addEventListener('mousemove', showControlsBriefly);
  hotzone.addEventListener('touchstart', showControlsBriefly, {passive:true});

  // Permet de garder la barre ouverte si la souris reste dessus
  controls.addEventListener('mouseenter', () => { clearTimeout(hideTimer); controls.classList.add('show'); });
  controls.addEventListener('mouseleave', () => { controls.classList.remove('show'); });

  // --- Helper: mise à jour du player (Hls quand dispo, sinon <video> direct)
  function setSource(url) {
    if (!url) return;
    // Si même URL -> ne rien faire
    if (currentUrl === url) return;

    // Hls.js dispo et nécessaire
    if (window.Hls && window.Hls.isSupported()) {
      if (hls) {
        try { hls.destroy(); } catch {}
        hls = null;
      }
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.attachMedia(playerEl);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
      hls.on(Hls.Events.MANIFEST_PARSED, () => { playerEl.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, data) => { console.warn('HLS error:', data?.details || data); });
    } else {
      // Safari natif HLS ou navigateur supportant m3u8 nativement
      playerEl.src = url;
      playerEl.play().catch(()=>{});
    }

    currentUrl = url;
    inputEl.value = url;
    stampStatus('Flux actualisé');
  }

  function stampStatus(msg) {
    const t = new Date();
    const hh = String(t.getHours()).padStart(2,'0');
    const mm = String(t.getMinutes()).padStart(2,'0');
    const ss = String(t.getSeconds()).padStart(2,'0');
    statusEl.textContent = `${msg} — ${hh}:${mm}:${ss}`;
  }

  async function fetchLatest() {
    const bust = Date.now();
    const url = `${LATEST_URL}?t=${bust}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json || !json.m3u8) throw new Error('latest.json sans champ m3u8');
    return String(json.m3u8);
  }

  async function pollOnce() {
    try {
      const next = await fetchLatest();
      if (autoEl.checked && next && next !== currentUrl) {
        setSource(next);
      } else if (!currentUrl) {
        // Démarrage: si AutoFollow est OFF mais pas d’URL en cours, charger quand même
        setSource(next);
      }
    } catch (err) {
      console.warn('poll error:', err && (err.message || err));
      stampStatus('Erreur de poll');
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollOnce, POLL_MS);
  }

  // Démarrage
  pollOnce();
  startPolling();

  autoEl.addEventListener('change', () => {
    stampStatus(autoEl.checked ? 'Suivi auto activé' : 'Suivi auto désactivé');
  });

})();