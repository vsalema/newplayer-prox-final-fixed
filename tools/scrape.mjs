import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { request } from "undici";

const PAGE_URL = process.env.PAGE_URL || "https://www.freeshot.live/live-tv/cmtv/330";
const OUT_PATH = "data/latest.json";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";

function pickM3u8(html) {
  const pref = /https?:\/\/[^\s\"'<>]+?\/index\.fmp4\.m3u8[^\s\"'<>]*/gi;
  const all  = /https?:\/\/[^\s\"'<>]+?\.m3u8[^\s\"'<>]*/gi;

  const prefHits = html.match(pref) || [];
  if (prefHits.length) return prefHits.sort((a,b)=>b.length-a.length)[0];

  const hits = html.match(all) || [];
  if (hits.length) return hits.sort((a,b)=>b.length-a.length)[0];

  return null;
}

async function fetchHtml(url) {
  const { body, statusCode } = await request(url, {
    method: "GET",
    headers: {
      "user-agent": UA,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.7,en;q=0.6",
      "pragma": "no-cache",
      "cache-control": "no-cache",
    },
    maxRedirections: 5,
  });
  if (statusCode < 200 || statusCode >= 400) {
    throw new Error(`Bad status ${statusCode}`);
  }
  return await body.text();
}

async function headOk(url) {
  try {
    const { statusCode } = await request(url, {
      method: "HEAD",
      headers: { "user-agent": UA, "accept": "*/*" },
    });
    return statusCode >= 200 && statusCode < 400;
  } catch {
    return true;
  }
}

async function readCurrent() {
  try {
    const raw = await readFile(OUT_PATH, "utf8");
    const js = JSON.parse(raw);
    return js?.m3u8 || "";
  } catch {
    return "";
  }
}

(async () => {
  console.log(">> Page:", PAGE_URL);
  const html = await fetchHtml(PAGE_URL);

  const m3u8 = pickM3u8(html);
  if (!m3u8) throw new Error("Aucune URL .m3u8 trouvée");

  console.log(">> Candidat m3u8:", m3u8);
  const ok = await headOk(m3u8);
  if (!ok) console.warn("!! HEAD pas concluant, on continue quand même");

  const current = await readCurrent();
  if (current === m3u8) {
    console.log(">> latest.json déjà à jour.");
    process.exit(0);
  }

  const out = { m3u8 };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(">> Mise à jour de", OUT_PATH);
})().catch((e) => {
  console.error("Scrape failed:", e.message);
  process.exit(1);
});
