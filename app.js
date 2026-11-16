/* =========================================================
   A letter from Caco: envelope → letter writes itself → menu
   ========================================================= */

// Web3Forms access key: requests are emailed to the address this key was created with.
const WEB3FORMS_KEY = "bc174033-eb47-4a75-a7f9-b88ffb377be9";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- sound ---------------- */
const Sound = {
  ctx: null, sfx: null, mus: null, noise: null, muted: false, musicNode: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0; this.mus.connect(this.master);
    // 2s white noise buffer, reused by every effect
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    try { this.muted = localStorage.getItem("muted") === "1"; } catch (e) {}
    this.master.gain.value = this.muted ? 0 : 1;
  },

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state !== "running") this.ctx.resume();
  },

  src(filterType, freq, q) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.sfx);
    s.start(this.ctx.currentTime, Math.random() * 1.5);
    return { s, f, g };
  },

  // scratchy pen: a few short strokes spread over `ms`
  pen(ms, strength = 1) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const dur = ms / 1000;
    const { s, g } = this.src("bandpass", rand(2600, 3800), 0.9);
    const strokes = Math.max(1, Math.round(dur / 0.07));
    for (let i = 0; i < strokes; i++) {
      const t = t0 + (i / strokes) * dur;
      const peak = rand(0.05, 0.11) * strength;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + Math.min(0.065, dur / strokes + 0.02));
    }
    s.stop(t0 + dur + 0.1);
  },

  // crinkly paper: dense random crackles
  rustle(dur = 0.6, vol = 0.35, freq = 2400) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const { s, g } = this.src("bandpass", freq, 0.6);
    let t = t0;
    while (t < t0 + dur) {
      const env = Math.sin(Math.PI * (t - t0) / dur);
      g.gain.setValueAtTime(rand(0.02, 1) * vol * env + 0.0001, t);
      t += rand(0.008, 0.03);
    }
    g.gain.setValueAtTime(0.0001, t0 + dur);
    s.stop(t0 + dur + 0.05);
  },

  // soft swoosh (paper sliding)
  slide(dur = 0.7, vol = 0.18) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const { s, f, g } = this.src("bandpass", 900, 0.5);
    f.frequency.setValueAtTime(700, t0);
    f.frequency.exponentialRampToValueAtTime(3200, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.stop(t0 + dur + 0.05);
  },

  // little paper tap (stickers landing)
  tap(vol = 0.3) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const { s, g } = this.src("lowpass", 1400, 0.7);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    s.stop(t0 + 0.12);
  },

  startMusic(audio) {
    if (!this.ctx) return;
    try {
      if (!this.musicNode) {
        this.musicNode = this.ctx.createMediaElementSource(audio);
        this.musicNode.connect(this.mus);
      }
    } catch (e) { /* fall back to element volume */ audio.volume = 0.35; }
    audio.play().catch(() => {});
    const t = this.ctx.currentTime;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setValueAtTime(0, t);
    this.mus.gain.linearRampToValueAtTime(0.38, t + 4);
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem("muted", m ? "1" : "0"); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.08);
  },
};

/* ---------------- elements ---------------- */
const stage = $("#stage");
const envelope = $("#envelope");
const letter = $("#letter");
const paper = $("#paper");
const nib = $("#nib");
const music = $("#music");
const soundBtn = $("#sound");
const skipBtn = $("#skip");
const penBtn = $("#pen");

/* ---------------- envelope ---------------- */
let opened = false;
envelope.addEventListener("click", openEnvelope);

async function openEnvelope() {
  if (opened) return;
  opened = true;
  Sound.unlock();
  Sound.startMusic(music);
  soundBtn.hidden = false;
  soundBtn.classList.toggle("muted", Sound.muted);

  Sound.tap(0.45);
  envelope.classList.add("open");
  await sleep(180);
  Sound.rustle(0.55, 0.3, 2000);
  await sleep(520);
  Sound.slide(0.9, 0.2);
  await sleep(1000);
  stage.classList.add("leaving");
  Sound.rustle(0.5, 0.22, 2800);
  await sleep(650);
  stage.hidden = true;
  letter.hidden = false;
  window.scrollTo(0, 0);
  requestAnimationFrame(() => letter.classList.add("in"));
  await sleep(500);
  write();
}

/* ---------------- writing engine ---------------- */
let skipping = false;
let userScrolled = false;

function splitWords(el) {
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const span = document.createElement("span");
          span.className = "word";
          span.textContent = p;
          frag.appendChild(span);
          words.push(span);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") {
        walk(n);
      }
    });
  };
  walk(el);
  return words;
}

function buildQueue() {
  // pop-in targets get hidden until the pen reaches them
  const pops = [$(".sticker.me"), $(".tape"), ...$$(".faces figure")];
  pops.forEach((p) => p.classList.add("pop"));
  const nodes = $$(".w, .pop, path.draw", paper);
  return nodes.map((n) => {
    if (n.classList.contains("w")) return { type: "text", el: n, words: splitWords(n) };
    if (n.tagName.toLowerCase() === "path") return { type: "draw", el: n };
    return { type: "pop", el: n };
  });
}

function placeNib(word, dur) {
  const pr = paper.getBoundingClientRect();
  const r = word.getBoundingClientRect();
  nib.style.transition = "none";
  nib.style.left = r.left - pr.left + "px";
  nib.style.top = r.bottom - pr.top - 4 + "px";
  nib.getBoundingClientRect(); // flush
  nib.style.transition = `left ${dur}ms linear, top 160ms ease, opacity .4s`;
  nib.style.left = r.right - pr.left + "px";
}

function follow(el) {
  if (userScrolled) return;
  const r = el.getBoundingClientRect();
  const limit = innerHeight * 0.72;
  if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit + 40, behavior: "smooth" });
}

function finishAll(queue) {
  paper.classList.remove("writing");
  queue.forEach((q) => {
    if (q.type === "text") { q.el.classList.add("go"); q.words.forEach((w) => w.classList.add("on")); }
    if (q.type === "draw") q.el.classList.add("drawn");
    if (q.type === "pop") q.el.classList.remove("pop");
  });
  nib.classList.remove("show");
}

const QUEUE = buildQueue();
paper.classList.add("writing");

async function write() {
  const queue = QUEUE;
  if (reduceMotion) { finishAll(queue); penBtn.hidden = false; return; }

  skipBtn.hidden = false;
  nib.classList.add("show");

  for (const q of queue) {
    if (skipping) break;
    if (q.type === "pop") {
      follow(q.el);
      await sleep(120);
      q.el.classList.remove("pop");
      Sound.tap(0.35);
      Sound.rustle(0.25, 0.15, 3000);
      await sleep(260);
      continue;
    }
    if (q.type === "draw") {
      q.el.classList.add("drawn");
      Sound.pen(700, 0.8);
      await sleep(380);
      continue;
    }
    // text
    const isHand = q.el.matches(".hand, .quip, figcaption");
    const perChar = isHand ? 26 : 11;
    q.el.classList.add("go");
    for (const w of q.words) {
      if (skipping) break;
      const d = Math.max(70, Math.min(520, w.textContent.length * perChar));
      w.style.setProperty("--d", d + "ms");
      placeNib(w, d);
      w.classList.add("on");
      Sound.pen(d, isHand ? 1.1 : 0.85);
      follow(w);
      await sleep(d + (isHand ? 35 : 20));
    }
    await sleep(q.el.matches("p") ? 260 : 120);
  }

  finishAll(queue);
  skipBtn.hidden = true;
  await sleep(300);
  penBtn.hidden = false;
  Sound.tap(0.25);
}

skipBtn.addEventListener("click", () => {
  skipping = true;
  skipBtn.hidden = true;
  Sound.rustle(0.4, 0.25, 2600);
});
["touchmove", "wheel"].forEach((e) =>
  addEventListener(e, () => { if (paper.classList.contains("writing")) userScrolled = true; }, { passive: true })
);

/* ---------------- sound toggle ---------------- */
soundBtn.addEventListener("click", () => {
  Sound.unlock();
  const m = !Sound.muted;
  Sound.setMuted(m);
  soundBtn.classList.toggle("muted", m);
  soundBtn.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound");
  if (!m && music.paused) music.play().catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (!opened) return;
  if (document.hidden) music.pause();
  else if (!Sound.muted) music.play().catch(() => {});
});

/* ---------------- request sheet ---------------- */
const sheet = $("#sheet");
const card = $(".card", sheet);
const steps = { who: $(".step-who"), write: $(".step-write"), sent: $(".step-sent") };
const msg = $("#msg");
const err = $("#form-error");
const sendBtn = $(".step-write .send");
let who = null;

function showStep(name) {
  Object.entries(steps).forEach(([k, el]) => (el.hidden = k !== name));
}

function openSheet() {
  Sound.unlock();
  Sound.rustle(0.4, 0.25, 2600);
  card.classList.remove("folding");
  showStep(who ? "write" : "who");
  sheet.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  sheet.hidden = true;
  document.body.style.overflow = "";
}
penBtn.addEventListener("click", openSheet);
sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

$$(".pick button").forEach((b) =>
  b.addEventListener("click", () => {
    who = b.dataset.who;
    $("#who-img").src = b.querySelector("img").src;
    $("#who-img").alt = who;
    Sound.tap(0.35);
    showStep("write");
  })
);
$("[data-back]").addEventListener("click", () => { who = null; showStep("who"); });

$$(".chip").forEach((c) => {
  c.setAttribute("aria-pressed", "false");
  c.addEventListener("click", () => {
    const on = c.getAttribute("aria-pressed") !== "true";
    c.setAttribute("aria-pressed", String(on));
    Sound.pen(160, 0.9);
  });
});

let lastKey = 0;
msg.addEventListener("input", () => {
  const now = performance.now();
  if (now - lastKey > 90) { Sound.pen(90, 0.6); lastKey = now; }
});

$(".step-write").addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const picks = $$(".chip[aria-pressed='true']").map((c) => c.textContent.trim());
  const note = msg.value.trim();
  if (!picks.length && !note) {
    err.textContent = "write something first (or tap an idea above)!";
    err.hidden = false;
    return;
  }
  if ($("[name=botcheck]").checked) return;

  sendBtn.disabled = true;
  sendBtn.textContent = "folding…";
  Sound.rustle(0.6, 0.3, 2200);

  const lines = [];
  if (picks.length) lines.push("Ideas they tapped: " + picks.join(", "));
  if (note) lines.push("Their note:\n" + note);

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `🍽️ ${who} wants: ${picks[0] || note.slice(0, 40)}`,
        from_name: `${who} (holiday menu)`,
        requested_by: who,
        requested_items: picks.join(", ") || "-",
        message: lines.join("\n\n"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || res.status);

    card.classList.add("folding");
    Sound.slide(0.6, 0.2);
    await sleep(520);
    showStep("sent");
    Sound.tap(0.4);
    msg.value = "";
    $$(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
  } catch (ex) {
    err.textContent = "the mail carrier tripped. check your connection and try again?";
    err.hidden = false;
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = "fold &amp; send ✉︎";
  }
});
