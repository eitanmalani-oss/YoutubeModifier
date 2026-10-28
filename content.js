// ===================== EDITABLE LISTS =====================
// Genres shown in the popup (4 picked at random each time). Your choice is ignored.
const GENRES = [
  "Comedy", "Music", "Gaming", "Sports", "Cooking", "Science", "Travel", "Movies & TV",
  "Fashion & Beauty", "Fitness", "Pets & Animals", "Tech", "DIY", "Anime", "Podcasts",
  "Cars", "History", "Art", "Nature", "Reaction Videos", "Vlogs", "ASMR", "Dance", "Finance"
];

// Random searches are built from one TOPIC + one STYLE, e.g. "lighthouse documentary".
// Keep these harmless; this is what keeps the random videos appropriate.
const TOPICS = [
  "baby goats", "how bridges are built", "pottery wheel", "jazz piano", "origami crane",
  "volcano", "train ride", "bread baking", "chess opening", "deep sea creatures",
  "knitting", "lighthouse", "beekeeping", "glass blowing", "rubik's cube", "paper airplane",
  "woodworking", "space station tour", "penguins", "marching band", "figure skating",
  "sushi making", "lego build", "hot air balloon", "calligraphy", "tide pools", "clock repair",
  "sheepdog", "tap dance", "sand sculpture", "bonsai", "honeybees", "sourdough",
  "ancient rome", "how pencils are made", "cave exploring", "northern lights", "otters",
  "bicycle repair", "watercolor painting", "airport behind the scenes", "how crayons are made",
  "mountain goats", "cheese making", "blacksmith", "orchestra rehearsal", "sea turtles",
  "card tricks", "kite flying", "japanese garden", "snow plow", "map making", "dominoes",
  "planetarium", "library tour", "tree house build", "whale songs", "puzzle solving",
  "apple orchard", "canal boat", "tractor", "fireflies"
];
const STYLES = [
  "documentary", "tutorial", "explained", "for beginners", "history of", "behind the scenes",
  "how it works", "short film", "timelapse", "a day in the life", "1990s", "vintage footage", ""
];
// ==========================================================

const S = sessionStorage;
let host = null;

function videoIdFrom(url) {
  try {
    const u = new URL(url, location.origin);
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/shorts\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch (e) { return null; }
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function pickN(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
function pauseVideos() {
  document.querySelectorAll("video").forEach(v => { try { v.pause(); } catch (e) {} });
}

// ---------- Popup (Shadow DOM so YouTube's CSS can't interfere) ----------
const STYLE = `
  .overlay { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,0.78);
    display: flex; align-items: center; justify-content: center; pointer-events: auto;
    font-family: "Roboto", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; }
  .box { background: #fff; color: #0f0f0f; border-radius: 16px; padding: 32px 36px;
    width: min(460px, 90vw); text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .title { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
  .sub { font-size: 14px; color: #606060; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  button { font: inherit; font-size: 16px; font-weight: 600; padding: 14px 10px; border: none;
    border-radius: 12px; background: #f2f2f2; color: #0f0f0f; cursor: pointer; }
  button:hover { background: #e5e5e5; }
  .loading { font-size: 22px; font-weight: 600; color: #fff; text-align: center; }
  .dots::after { content: ""; animation: d 1.2s steps(4) infinite; }
  @keyframes d { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} }
  .toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%); z-index: 2147483647;
    background: #0f0f0f; color: #fff; padding: 14px 22px; border-radius: 999px; font-size: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4); transition: opacity 0.6s; pointer-events: none;
    font-family: "Roboto", -apple-system, Helvetica, Arial, sans-serif; }
`;

function mount(html) {
  unmount();
  host = document.createElement("div");
  host.id = "nwyaf-host";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${STYLE}</style>${html}`;
  (document.documentElement || document).appendChild(host);
  return root;
}
function unmount() { if (host) host.remove(); host = null; }

function showGenrePopup() {
  if (host && host.isConnected && host.dataset.kind === "genre") return;
  pauseVideos();
  const genres = pickN(GENRES, 4);
  const root = mount(`
    <div class="overlay"><div class="box">
      <div class="title">What would you like to watch?</div>
      <div class="sub">Pick a genre and we'll find something for you.</div>
      <div class="grid">${genres.map(g => `<button data-genre="${g}">${g}</button>`).join("")}</div>
    </div></div>`);
  host.dataset.kind = "genre";
}

function showLoading() {
  mount(`<div class="overlay"><div class="loading">Personalizing your recommendations<span class="dots"></span></div></div>`);
  host.dataset.kind = "loading";
}

function showToast(text) {
  const t = document.createElement("div");
  t.id = "nwyaf-toast";
  const root = t.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${STYLE}</style><div class="toast">${text}</div>`;
  document.documentElement.appendChild(t);
  setTimeout(() => { const el = root.querySelector(".toast"); if (el) el.style.opacity = "0"; }, 6000);
  setTimeout(() => t.remove(), 7000);
}

// ---------- Sending you somewhere random ----------
function goRandom(genre) {
  S.setItem("nwyaf_genre", genre || "");
  S.setItem("nwyaf_pending", "1");
  S.setItem("nwyaf_tries", "0");
  searchRandom();
}
function searchRandom() {
  const q = (pick(STYLES) + " " + pick(TOPICS)).trim();
  const sp = encodeURIComponent("EgIQAQ=="); // YouTube's "videos only" search filter
  location.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=" + sp;
}

// On the hidden search page: wait for results, then jump to a random one.
let picking = false;
function pickFromResults() {
  if (picking) return;
  picking = true;
  showLoading();
  const started = Date.now();
  const timer = setInterval(() => {
    const ids = [];
    document.querySelectorAll('a[href*="/watch?v="]').forEach(a => {
      if (a.closest("ytd-ad-slot-renderer, ytd-promoted-video-renderer, ytd-reel-shelf-renderer")) return;
      const id = videoIdFrom(a.getAttribute("href"));
      if (id && !ids.includes(id)) ids.push(id);
    });
    if (ids.length >= 3 || (ids.length && Date.now() - started > 4000)) {
      clearInterval(timer);
      const id = pick(ids.slice(0, 20));
      S.setItem("nwyaf_allowed", id);
      S.setItem("nwyaf_toast", "1");
      S.removeItem("nwyaf_pending");
      location.href = "https://www.youtube.com/watch?v=" + id;
    } else if (Date.now() - started > 10000) {
      clearInterval(timer);
      const tries = Number(S.getItem("nwyaf_tries") || 0) + 1;
      if (tries < 3) { S.setItem("nwyaf_tries", String(tries)); searchRandom(); }
      else { S.removeItem("nwyaf_pending"); unmount(); }
    }
  }, 300);
}

// ---------- Deciding what to do on each page ----------
function check() {
  if (location.pathname === "/results" && S.getItem("nwyaf_pending")) return pickFromResults();
  const id = videoIdFrom(location.href);
  if (id && id !== S.getItem("nwyaf_allowed")) return showGenrePopup();
  if (host && host.dataset.kind === "genre") unmount();
  if (id && S.getItem("nwyaf_toast")) {
    S.removeItem("nwyaf_toast");
    const g = S.getItem("nwyaf_genre");
    showToast(g ? `You asked for ${g}. We thought you'd like this instead.` : "We thought you'd like this.");
  }
}

// Catch clicks before YouTube does (this script loads before YouTube's own code).
["click", "mousedown", "pointerdown", "pointerup", "mouseup", "auxclick"].forEach(type => {
  window.addEventListener(type, e => {
    const path = e.composedPath();

    // Clicks inside our popup
    if (host && path.includes(host)) {
      e.stopImmediatePropagation();
      if (type === "click") {
        const btn = path.find(el => el && el.dataset && el.dataset.genre);
        if (btn) { e.preventDefault(); goRandom(btn.dataset.genre); }
      }
      return;
    }

    // Clicks on any video link: stop it and ask for a genre instead
    const link = path.find(el => el && el.tagName === "A" && el.href);
    const id = link && videoIdFrom(link.href);
    if (id && id !== S.getItem("nwyaf_allowed")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === "click") showGenrePopup();
    }
  }, true);
});

// Keep videos paused while the popup is up, and re-check whenever YouTube changes page.
setInterval(() => {
  if (host && host.isConnected) pauseVideos();
  else if (host && !host.isConnected) { (document.documentElement).appendChild(host); }
}, 300);
window.addEventListener("yt-navigate-finish", check);
document.addEventListener("DOMContentLoaded", check);
if (document.readyState !== "loading") check();
