// Exemple non intrusif : vérifie périodiquement si data/latest.json a changé
async function fetchLatest() {
  const res = await fetch("data/latest.json?ts=" + Date.now(), { cache: "no-store" });
  const js  = await res.json();
  return js && js.m3u8 ? String(js.m3u8) : "";
}

let currentUrl = "";
let hls;

async function applyLatest() {
  try {
    const url = await fetchLatest();
    if (!url || url === currentUrl) return;
    currentUrl = url;

    const video = document.querySelector("#video");
    if (!video) return;

    if (hls) { try { hls.destroy(); } catch {} hls = null; }

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(()=>{});
    } else {
      console.warn("HLS non supporté.");
    }
  } catch (e) {
    console.warn("applyLatest error:", e);
  }
}

setInterval(applyLatest, 15000);
applyLatest();
