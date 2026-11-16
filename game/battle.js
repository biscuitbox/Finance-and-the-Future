/* 금고 탈출 — 단원 보스전 (턴제 전투 화면)
   · 통과한 차시 금고의 자물쇠 문제를 차시별로 돌아가며 섞어 냄
   · 맞히면 그 차시에 맞는 기술로 공격 → 보스 체력 −1, 보스가 방금 맞힌 답을 두고 반응
   · 틀리면 보스가 공격 → 에너지(목숨) −1, 보스가 학생이 고른 답을 두고 놀림
   · 보스 체력 0이면 승리(보스 카드), 에너지 0이면 패배 → 처음부터 다시. 기록은 차시 번호 35~37
   이 파일은 index.html 본문 스크립트보다 먼저 읽히지만, 함수 안에서만 본문의 $·esc·R 등을 쓴다. */

/* 받침에 따라 조사 고르기 */
function josa(w, a, b) { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? a : b; }
const eul = w => josa(w, "을", "를");
const iga = w => josa(w, "이", "가");
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 보스전 입구 ---------- */
async function viewBoss(u) {
  const B0 = BOSSES.find(b => b.u === u); if (!B0) { location.hash = ""; return; }
  const m = me();
  $("#app").innerHTML = topbar() + `<div class="wrap" style="color:#fff">보스를 부르는 중…</div>`; bindTop();
  await syncDex();
  const dex = dexLocal();
  const got = CHAPTERS.filter(c => c.u === u && (PREVIEW || dex[c.n])).map(c => c.n);
  if (got.length < B0.need) {
    $("#app").innerHTML = topbar() + `<div class="intro"><span class="qtag">${esc(B0.t)}</span><h1>${B0.icon} 아직 잠겨 있어요</h1>
      <div class="story">${esc(REGIONS[u].name)}의 금고를 <b>${B0.need}개 이상</b> 열면 ${esc(B0.name)}에게 도전할 수 있어요. 지금 <b>${got.length}개</b> 열었어요.</div>
      <div class="act"><a class="btn big" href="#" style="text-decoration:none">모험 지도로</a></div></div>`;
    bindTop(); return;
  }
  let rec = null, cls = null, offline = false;
  if (!PREVIEW) try { [cls, rec] = await Promise.all([DB.getClass(m.code), DB.getRecord(m.code, B0.n, m.num)]); } catch (e) { offline = true; }
  if (rec && rec._foreign) return viewBlocked({ n: B0.n }, "foreign");
  if (cls === null && !offline && !PREVIEW) return viewBlocked({ n: B0.n }, "noclass");
  const closed = cls && cls.open === false, cleared = rec && rec.status === "cleared";
  if (cleared) dexPut(B0.n, { ...B0.card, stars: rec.stars });
  const games = (await Promise.all(got.map(n => loadGame(n).catch(() => null)))).filter(Boolean);
  $("#app").innerHTML = topbar() + `<div class="intro">
    <span class="qtag">${esc(B0.t)} · ${esc(REGIONS[u].name)}</span><h1>${B0.icon} ${esc(B0.name)}${iga(B0.name)} 길을 막고 있어요!</h1>
    <div class="story">“${esc(B0.intro)}”</div>
    <ul><li>${esc(B0.name)}${iga(B0.name)} 문제를 내요. 맞히면 내 기술로 공격해 <b>보스 체력</b>이 줄어요. <b>${B0.hp}번</b> 맞히면 승리!</li>
      <li>틀리면 보스가 반격해 <b>내 에너지</b>가 줄어요. 에너지는 <b>${B0.lives}칸</b>, 모두 잃으면 처음부터 다시 도전해요.</li>
      <li>${PREVIEW ? `이 단원 금고 <b>${games.length}개</b>(${got[0]}~${got[got.length - 1]}차시) 문제가 섞여 나와요. 학생에게는 자기가 연 금고의 문제만 나와요.` : `내가 연 금고 <b>${games.length}개</b>(${got.map(n => n + "차시").join(", ")})에서 문제가 섞여 나와요.`}</li>
      <li>별: 한 번도 안 틀리면 ★★★ · 1번 ★★ · 2번 ★. 이기면 <b>보스 카드</b>를 받아요.</li></ul>
    ${cleared ? `<div class="demo">이미 물리친 보스예요 (${"★".repeat(rec.stars || 1)}). 다시 하면 <b>연습</b>이라 기록은 바뀌지 않아요.</div>` : ""}
    ${PREVIEW ? PV_NOTE : ""}
    ${closed && !cleared ? `<div class="demo">선생님이 지금은 기록을 닫아 두었어요. <b>연습</b>으로만 할 수 있어요.</div>` : ""}
    ${offline ? `<div class="demo">인터넷 연결이 불안정해요. 게임은 할 수 있고, 연결되면 기록을 다시 보내요.</div>` : ""}
    <div class="act"><button class="btn big amber" id="start">${PREVIEW ? "미리 해 보기" : cleared || closed ? "연습 전투 시작" : "전투 시작"} ⚔️</button><a class="btn big ghost" style="color:var(--pine);text-decoration:none" href="#">모험 지도</a></div></div>`;
  bindTop();
  $("#start").onclick = () => startBoss(B0, games, rec, cleared || closed || PREVIEW);
}

/* 차시를 돌아가며 자물쇠를 하나씩 뽑아 문제 순서를 만듦 (같은 차시가 몰리지 않게) */
function bossDeck(games) {
  const lists = R.shuffle(games).map(g => R.shuffle(g.locks.map((_, i) => ({ g, li: i, st: { used: [] } }))));
  const deck = [];
  for (let r = 0; lists.some(l => l[r]); r++) lists.forEach(l => { if (l[r]) deck.push(l[r]); });
  return deck;
}

/* ---------- 전투 시작 ---------- */
let BID = 0;
function startBoss(B0, games, rec, practice) {
  const old = S && S.boss === B0 ? S : null;
  S = {
    bid: ++BID, g: { n: B0.n, title: B0.t }, boss: B0, games, practice, phase: "intro",
    hp: B0.hp, lives: B0.lives, right: 0, wrong: 0, miss: [], qi: 0,
    allMiss: practice ? [] : old ? old.allMiss.slice() : (rec && rec.status === "playing" ? (rec.miss || []).slice() : []), deck: bossDeck(games), v: null, cur: null,
    startedAt: Date.now(), firstStart: (rec && rec.startedAt) || (old && old.firstStart) || Date.now(),
    restarts: practice ? 0 : old ? old.restarts + 1 : (rec && rec.status === "playing" ? (rec.restarts || 0) + 1 : (rec && rec.restarts) || 0),
    prevWrong: practice ? 0 : old ? old.prevWrong + old.wrong : (rec && rec.status === "playing" ? rec.wrong || 0 : 0),
    saveState: practice ? "practice" : "idle", pending: null, pname: PREVIEW ? "선생님" : `${+me().num}번 탐험가`
  };
  const u = B0.u, deco = REGIONS[u].deco, spots = [["44%", "86%"], ["40%", "30%"], ["58%", "56%"], ["4%", "34%"], ["82%", "50%"]];
  $("#app").innerHTML = topbar(`<span class="pill">${esc(B0.t)}${practice ? '<span class="badge">연습</span>' : ""}</span><span class="pill">⏱ <span id="elapsed">0분 0초</span></span><span class="pill" id="sv"></span>`) +
    `<div class="battle">
      <div class="bleft"><div class="arena u${u}" id="arena">
        ${spots.map((p, i) => `<span class="deco" style="left:${p[0]};top:${p[1]}">${deco[i % deco.length]}</span>`).join("")}
        <div class="plat e"></div><div class="plat p"></div>
        <div class="stat-box e"><div class="nm">${esc(B0.name)} <small>${esc(B0.t.replace(" 보스전", ""))} 보스</small></div>
          <div class="gauge">체력 <span class="bar"><i id="gE"></i></span><span class="num" id="nE"></span></div></div>
        <div class="sprite e enter-e" id="spE">${B0.icon}</div>
        <div class="sprite p enter-p" id="spP">🧙</div>
        <div class="stat-box p"><div class="nm">${esc(S.pname)} <small id="cnt"></small></div>
          <div class="gauge" style="color:#127475">에너지 <span class="bar"><i id="gP"></i></span><span class="num" id="nP"></span></div></div>
      </div>
      <div class="msgbox" id="msg"></div></div>
      <div class="bq lock" id="bq"></div>
    </div>`;
  bindTop(); drawGauges(); drawSave();
  saveBoss(false);
  const tick = setInterval(() => { const e = $("#elapsed"); if (e) e.textContent = mmss(Math.floor((Date.now() - S.startedAt) / 1000)); }, 1000);
  cleanup = () => clearInterval(tick);
  bindSayKeys();
  introSeq(S.bid);
}
const alive = bid => S && S.bid === bid && document.getElementById("arena");
async function introSeq(bid) {
  const B0 = S.boss, A = $("#arena");
  const vs = document.createElement("div"); vs.className = "vs"; vs.textContent = "⚔️ 보스 등장!"; A.appendChild(vs); setTimeout(() => vs.remove(), 1200);
  sfx("start"); await sleep(900); if (!alive(bid)) return;
  $("#spE").classList.remove("enter-e"); $("#spE").classList.add("idle"); $("#spP").classList.remove("enter-p");
  await say(`${B0.name}${iga(B0.name)} 앞을 가로막았다!`); if (!alive(bid)) return;
  await say(`“${B0.intro}”`, B0.name); if (!alive(bid)) return;
  bossTurn(bid);
}

/* ---------- 한 턴: 보스가 문제를 낸다 ---------- */
async function bossTurn(bid) {
  if (!alive(bid)) return;
  const B0 = S.boss;
  if (S.qi >= S.deck.length) S.deck = S.deck.concat(bossDeck(S.games));
  const it = S.deck[S.qi++], L = it.g.locks[it.li];
  S.cur = it; S.v = variantOf(L, it.st); S.phase = "ask";
  const bq = $("#bq"); bq.classList.add("lock"); bq.innerHTML = "";
  await say(`${B0.name}의 ${S.qi}번째 문제 공격! — ${it.g.n}차시 「${it.g.title}」`, "", 500); if (!alive(bid)) return;
  bq.innerHTML = `<span class="qtag">⚔️ ${S.qi}번째 문제 · ${L.icon || "🔒"} ${esc(L.title)}</span><div class="bsrc">${it.g.n}차시 · ${esc(it.g.title)}</div>` + qHTML(S.v, "정답으로 공격! ⚔️");
  bq.classList.remove("lock"); S.phase = "boss"; S.askAt = Date.now();
  if (innerWidth <= 1000) bq.scrollIntoView({ block: "nearest", behavior: "smooth" });   /* 좁은 화면: 문제가 보이게 */
  bindQ(bq, S.v, judgeBoss);
}

/* ---------- 판정과 연출 ---------- */
/* 보스 반응 대사 — 방금 푼 문제와 학생의 답으로 만든다 (엉뚱한 말이 나오지 않게) */
function reactLine(ok, v, info) {
  const q = s => s.length > 22 ? s.slice(0, 21) + "…" : s, u = v.unit || "";
  if (ok) {
    if (v.type === "choice") { const t = v.opts.find(o => o.ok).t; return R.one([`으윽, 「${q(t)}」 — 정답을 알고 있었구나!`, `「${q(t)}」${eul(q(t))} 맞히다니… 크으윽!`]); }
    if (v.type === "number") return R.one([`${fmt(v.answer)}${u}?! 계산까지 정확하다니!`, `${fmt(v.answer)}${u}… 계산기도 없이 맞혔다고?!`]);
    if (v.type === "order") return R.one(["순서를 하나도 안 틀리다니… 크윽!", "차례차례 정확하게… 내 작전이 무너진다!"]);
    return R.one([`${v.items.length}개를 전부 바르게 나누다니!`, "하나도 안 헷갈리고 다 나눴다고?! 으악!"]);
  }
  if (v.type === "choice") return R.one([`헤헤, 「${q(info.pick || "")}」? 땡! 그건 아니지롱~`, `「${q(info.pick || "")}」${eul(q(info.pick || "") || "답")} 골랐어? 걸려들었다!`]);
  if (v.type === "number") return R.one([`${fmt(info.pick)}${u}? 계산이 틀렸지롱~`, `${fmt(info.pick)}${u}… 아깝지만 땡! 다시 계산해 봐~`]);
  if (v.type === "order") return R.one(["순서가 뒤죽박죽이야~ 헤헤!", "앞뒤가 바뀌었지롱~ 처음부터 차근차근 생각해 봐!"]);
  return R.one([`${info.wrong || "몇"}개나 잘못 나눴지롱~`, `헷갈렸지? ${info.wrong || "몇"}개가 틀렸어~`]);
}
async function judgeBoss(ok, extra = "", info = {}) {
  if (S.phase !== "boss") return;
  S.phase = "anim";
  const bid = S.bid, B0 = S.boss, v = S.v, n = S.cur.g.n;
  const LN = BATTLE[n] || { s: [["지식의 일격", "star"]] };
  const bq = $("#bq"), E = $("#spE"), P = $("#spP"), A = $("#arena");
  bq.classList.add("lock");
  if (ok) { S.hp--; S.right++; } else { S.lives--; S.wrong++; S.miss.push(n); S.allMiss.push(n); }
  saveBoss(false);
  if (ok) {
    const [sk, kind] = R.one(LN.s), fast = Date.now() - S.askAt < 15000;
    await say(`정답! ${S.pname}의 「${sk}」!`, "", 500); if (!alive(bid)) return;
    P.classList.add("lunge-p"); sfx("zap"); await sleep(220); P.classList.remove("lunge-p");
    await cast(kind, P, E); if (!alive(bid)) return;
    sfx("boom"); E.classList.remove("idle"); E.classList.add("hurt"); dmg(E, "−1", ""); drawGauges();
    await sleep(650); if (!alive(bid)) return;
    E.classList.remove("hurt"); if (S.hp > 0) E.classList.add("idle");
    if (fast && S.hp > 0) { await say("빠르고 정확한 일격! 보스가 크게 휘청거린다!"); if (!alive(bid)) return; }
    await say(`“${reactLine(true, v, info)}”`, B0.name, 600); if (!alive(bid)) return;
  } else {
    await say("앗, 틀렸다! 빈틈이 생겼다…"); if (!alive(bid)) return;
    const [ak, kind] = R.one(BOSS_ATK[B0.n] || [["반격", "hex"]]);
    await say(`${B0.name}의 「${ak}」!`, "", 500); if (!alive(bid)) return;
    E.classList.remove("idle"); E.classList.add("lunge-e"); sfx("roar"); await sleep(240); E.classList.remove("lunge-e");
    await cast(kind, E, P); if (!alive(bid)) return;
    sfx("hurt"); A.classList.remove("shake"); void A.offsetWidth; A.classList.add("shake");
    P.classList.add("hurt"); dmg(P, "에너지 −1", "p"); drawGauges(); E.classList.add("idle");
    await sleep(650); if (!alive(bid)) return;
    P.classList.remove("hurt");
    await say(`“${reactLine(false, v, info)}”`, B0.name, 600); if (!alive(bid)) return;
  }
  showRes(bid, ok, v, extra);
}
function showRes(bid, ok, v, extra) {
  const bq = $("#bq"), win = S.hp <= 0, lose = S.lives <= 0;
  const box = document.createElement("div"); box.className = "res " + (ok ? "good" : "bad");
  box.innerHTML = ok
    ? `<p>💡 ${esc(v.explain || "")}</p><div class="row"><button class="btn big amber" id="nx">${win ? "마지막 일격! ▶" : "다음 턴 ▶"}</button></div>`
    : `${extra ? `<p><b class="k">${esc(extra)}</b></p>` : ""}<p><b class="k">힌트</b> ${esc(v.hint || "")}</p><p><b class="k">풀이</b> ${esc(v.explain || "")}</p>
       <div class="row"><button class="btn big" id="nx" disabled>${lose ? "결과 보기" : "다음 턴"} (<span id="wt">3</span>)</button></div>`;
  bq.appendChild(box);
  box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  const nx = $("#nx");
  nx.onclick = () => { if (S.phase !== "anim") return; S.phase = "next"; if (win) return winSeq(bid); if (lose) return loseSeq(bid); bossTurn(bid); };
  if (ok) nx.focus();
  else { let t = 3; const iv = setInterval(() => { t--; const w = $("#wt"); if (w) w.textContent = t; if (t <= 0) { clearInterval(iv); const b = $("#nx"); if (b) { b.disabled = false; b.textContent = lose ? "결과 보기 ▶" : "다음 턴 ▶"; b.focus(); } } }, 1000);
    const pc = cleanup; cleanup = () => { clearInterval(iv); pc(); }; }
}
async function winSeq(bid) {
  const B0 = S.boss, E = $("#spE");
  $("#bq").innerHTML = "";
  E.classList.remove("idle"); E.classList.add("hurt"); sfx("boom"); await sleep(500); if (!alive(bid)) return;
  E.classList.add("faint"); sfx("win");
  await say(`${B0.name}${iga(B0.name)} 쓰러졌다!`); if (!alive(bid)) return;
  await say(`“${B0.lose}”`, B0.name); if (!alive(bid)) return;
  finishBoss();
}
async function loseSeq(bid) {
  const P = $("#spP");
  $("#bq").innerHTML = "";
  P.classList.add("faint"); sfx("hurt");
  await say("에너지가 바닥났다… 일단 물러나서 금고를 복습하자!"); if (!alive(bid)) return;
  loseBoss();
}

/* ---------- 화면 조각 ---------- */
function drawGauges() {
  const B0 = S.boss, e = S.hp / B0.hp, p = S.lives / B0.lives;
  const gE = $("#gE"), gP = $("#gP"); if (!gE) return;
  gE.style.width = Math.max(0, e * 100) + "%"; gE.className = e <= .2 ? "low" : e <= .5 ? "mid" : "";
  gP.style.width = Math.max(0, p * 100) + "%"; gP.className = p <= .34 ? "low" : p <= .67 ? "mid" : "";
  $("#nE").textContent = `${Math.max(0, S.hp)}/${B0.hp}`; $("#nP").textContent = `${Math.max(0, S.lives)}/${B0.lives}`;
  $("#cnt").textContent = `맞힘 ${S.right} · 틀림 ${S.wrong}`;
}
/* 메시지 상자에 한 글자씩 — 읽을 수 있게 천천히 쓰고, 글 길이만큼 기다린다.
   대사 상자를 누르거나 Space·Enter를 누르면 바로 다 보이고, 한 번 더 누르면 다음으로 넘어간다. */
let sayTap = null;
const SAY_CHAR = 45, SAY_BASE = 1100, SAY_PER = 55, SAY_MAX = 4500;
async function say(text, who = "", hold = null) {
  const bid = S && S.bid, el = $("#msg"); if (!el) return;
  /* 글 전체를 먼저 자리 잡아 두고(보이지 않게) 한 글자씩 드러낸다 → 두 줄 대사도 처음부터 두 줄 자리에서 나와 줄바꿈 때 글이 튀지 않는다 */
  const chars = Array.from(text);
  el.innerHTML = `${who ? `<span class="who">${esc(who)}:</span>` : ""}<span class="mtext" id="mt">${chars.map(c => `<span class="ch">${esc(c)}</span>`).join("")}</span><span class="caret wait">▼</span>`;
  const cs = $("#mt").children; let i = 0, skip = false;
  sayTap = () => { skip = true; };
  while (i < cs.length) {
    if (!alive(bid)) return;
    if (skip) { for (; i < cs.length; i++) cs[i].classList.add("on"); break; }
    cs[i++].classList.add("on"); if (i < cs.length) await sleep(SAY_CHAR);
  }
  const c = el.querySelector(".caret"); if (c) c.classList.remove("wait");
  const wait = hold == null ? Math.min(SAY_MAX, SAY_BASE + text.length * SAY_PER) : hold;
  await new Promise(res => { const t = setTimeout(res, wait); sayTap = () => { clearTimeout(t); res(); }; });
  sayTap = null;
}
function bindSayKeys() {
  $("#msg").onclick = () => { if (sayTap) sayTap(); };
  const kh = e => { if ((e.key === " " || e.key === "Enter") && sayTap && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); sayTap(); } };
  document.addEventListener("keydown", kh);
  const pc = cleanup; cleanup = () => { document.removeEventListener("keydown", kh); sayTap = null; pc(); };
}

/* ---------- 효과 ---------- */
const FX = { bolt: ["⚡", "#ffd84d"], fire: ["🔥", "#ff7a2f"], ice: ["❄️", "#9be3ff"], wind: ["🌪️", "#bff5e3"], star: ["✨", "#ffe08a"], slash: ["⚔️", "#ffffff"], water: ["💧", "#5fc3ff"],
  club: ["🔨", "#d08a4a"], hex: ["🌀", "#c77dff"], bubble: ["🫧", "#a7e9ff"], bomb: ["💣", "#ff5a5a"], fog: ["🌫️", "#c8c8d8"], drain: ["💸", "#8fd18f"] };
function centerOf(el) { const A = $("#arena").getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - A.left + r.width / 2, y: r.top - A.top + r.height / 2 }; }
async function cast(kind, from, to) {
  const A = $("#arena"); if (!A) return;
  { const r = A.getBoundingClientRect(); if (r.bottom < 80 || r.top > innerHeight - 120) { A.scrollIntoView({ block: "start", behavior: "smooth" }); await sleep(450); } }
  const [emo, col] = FX[kind] || FX.star, s = centerOf(from), t = centerOf(to);
  if (kind === "slash" || kind === "club") {
    for (let i = 0; i < 3; i++) {
      const d = document.createElement("div"); d.className = "slash";
      d.style.left = (t.x - 110) + "px"; d.style.top = (t.y - 4 + (i - 1) * 24) + "px"; d.style.setProperty("--r", (kind === "club" ? 60 + i * 10 : -35 + i * 30) + "deg");
      if (kind === "club") d.style.background = `linear-gradient(90deg,transparent,${col},transparent)`;
      A.appendChild(d); setTimeout(() => d.remove(), 400); sfx("swish"); await sleep(120);
    }
  } else if (kind === "bolt") {
    for (let i = 0; i < 3; i++) {
      const d = document.createElement("div"); d.className = "bolt";
      d.style.left = (t.x - 8 + (i - 1) * 26) + "px"; d.style.top = "0px"; d.style.height = Math.max(40, t.y) + "px";
      A.appendChild(d); setTimeout(() => d.remove(), 500); await sleep(110);
    }
  } else {
    const n = kind === "star" || kind === "water" || kind === "bubble" ? 3 : 1;
    const runs = [];
    for (let k = 0; k < n; k++) {
      const p = document.createElement("div"); p.className = "fx"; p.textContent = emo;
      p.style.left = (s.x - 28) + "px"; p.style.top = (s.y - 28) + "px"; A.appendChild(p);
      const dx = t.x - s.x + (k - (n - 1) / 2) * 30, dy = t.y - s.y, arc = kind === "fog" ? 0 : -70;
      const an = p.animate([{ transform: "translate(0,0) scale(.5) rotate(0deg)" }, { transform: `translate(${dx * .5}px,${dy * .5 + arc}px) scale(1.1) rotate(200deg)` }, { transform: `translate(${dx}px,${dy}px) scale(1.5) rotate(360deg)` }],
        { duration: 620, delay: k * 120, easing: "ease-in", fill: "forwards" });
      runs.push(an.finished.catch(() => {}).then(() => p.remove()));
    }
    await Promise.all(runs);
  }
  burst(t, col); flash(col);
}
function burst(t, col) {
  const A = $("#arena"); if (!A) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("div"); s.className = "spark";
    const ang = i / 14 * Math.PI * 2, d = 50 + Math.random() * 60;
    s.style.left = (t.x - 6) + "px"; s.style.top = (t.y - 6) + "px"; s.style.background = col;
    s.style.setProperty("--dx", Math.cos(ang) * d + "px"); s.style.setProperty("--dy", Math.sin(ang) * d + "px");
    A.appendChild(s); setTimeout(() => s.remove(), 700);
  }
}
function flash(col) { const A = $("#arena"); if (!A) return; const f = document.createElement("div"); f.className = "flash"; f.style.background = col; A.appendChild(f); setTimeout(() => f.remove(), 400); }
function dmg(el, text, cls) { const A = $("#arena"); if (!A) return; const t = centerOf(el); const d = document.createElement("div"); d.className = "dmg " + cls; d.textContent = text; d.style.left = (t.x - 30) + "px"; d.style.top = (t.y - 70) + "px"; A.appendChild(d); setTimeout(() => d.remove(), 1000); }
/* 효과음 (작게, 음소거 따름) */
function sfx(kind) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime, g = actx.createGain(); g.connect(actx.destination);
    const tone = (type, f0, f1, d, vol = .07) => { const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + d); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d); o.connect(g); o.start(t0); o.stop(t0 + d); };
    const noise = (d, vol = .09) => { const b = actx.createBuffer(1, actx.sampleRate * d, actx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length); const s = actx.createBufferSource(); s.buffer = b; const f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; g.gain.setValueAtTime(vol, t0); s.connect(f).connect(g); s.start(t0); };
    if (kind === "zap") tone("square", 320, 1300, .22, .05);
    if (kind === "swish") noise(.12, .05);
    if (kind === "boom") noise(.35, .12);
    if (kind === "roar") tone("sawtooth", 180, 70, .35, .06);
    if (kind === "hurt") tone("sawtooth", 420, 90, .4, .06);
    if (kind === "start") tone("triangle", 220, 880, .5, .07);
    if (kind === "win") beep("open");
  } catch (e) {}
}

/* ---------- 결과 화면 ---------- */
function loseBoss() {
  S.phase = "lost"; cleanup();
  const B0 = S.boss;
  $("#app").innerHTML = topbar() + `<div class="clear"><div style="font-size:120px">${B0.icon}</div>
    <h1>앗, 에너지가 바닥났어요</h1><p style="font-size:20px;color:#f2d6d6">“${esc(R.one(B0.taunt))} 다시 와 봐!”</p>
    <div class="stats"><div class="stat"><b>${S.right} / ${B0.hp}</b><span>맞힌 문제</span></div><div class="stat"><b>${B0.hp - S.right}</b><span>남은 보스 체력</span></div></div>
    <p style="color:#b9d3cf">틀린 문제가 나온 차시: ${[...new Set(S.miss)].sort((a, b) => a - b).map(n => n + "차시").join(", ")} — 그 금고를 다시 풀어 보면 도움이 돼요.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button class="btn big amber" id="again">다시 도전 ⚔️</button><a class="btn big" href="#" style="text-decoration:none">🗺️ 모험 지도</a></div></div>`;
  bindTop();
  $("#again").onclick = () => startBoss(B0, S.games, null, S.practice);
}
function finishBoss() {
  S.phase = "done";
  const B0 = S.boss, stars = S.wrong === 0 ? 3 : S.wrong === 1 ? 2 : 1, sec = Math.floor((Date.now() - S.startedAt) / 1000);
  S.result = { stars, sec };
  if (!S.practice) { dexPut(B0.n, { ...B0.card, stars, at: Date.now() }); saveBoss(true); }
  else if (PREVIEW) dexPut(B0.n, { ...B0.card, stars, at: Date.now() });
  cleanup();
  const c = B0.card;
  $("#app").innerHTML = topbar() + `<div class="clear">
    <div style="font-size:18px;color:#b9d3cf">${esc(B0.t)}${S.practice ? '<span class="badge">연습</span>' : ""}</div>
    <h1>${esc(B0.name)}${eul(B0.name)} 물리쳤어요! 🎉</h1><p style="font-size:19px;color:#f2d6d6">“${esc(B0.lose)}”</p><div class="bigstars">${starTxt(stars)}</div>
    <div class="stats"><div class="stat"><b>${S.right}</b><span>맞힌 문제</span></div><div class="stat"><b>${S.wrong}번</b><span>틀림</span></div><div class="stat"><b>${mmss(sec)}</b><span>걸린 시간</span></div></div>
    <div class="flip" id="flip"><div class="in"><div class="f">${B0.icon}</div><div class="b s${stars}" style="border-color:#8C3A3A"><span class="cn">보스 카드</span><span class="ci">${c.icon}</span><span class="ct">${esc(c.term)}</span><span class="cl">${esc(c.line)}</span><span style="color:var(--amber);font-size:24px">${"★".repeat(stars)}</span></div></div></div>
    <p class="saved" id="savedmsg">${PREVIEW ? "교사 미리 보기라 기록은 남지 않아요." : S.practice ? "연습이라 기록은 바뀌지 않았어요." : "기록을 보내는 중…"}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn big amber" href="#dex" style="text-decoration:none">📒 내 도감 보기</a><a class="btn big" href="#" style="text-decoration:none">🗺️ 모험 지도</a></div></div>`;
  bindTop(); drawSave();
  setTimeout(() => { $("#flip") && $("#flip").classList.add("go"); beep("open"); }, 700);
}
function saveBoss(final) {
  if (S.practice) return;
  if (S.pending && S.pending.status === "cleared" && !final) return;
  const p = { status: final ? "cleared" : "playing", locks: [], firstOk: S.right, wrong: S.prevWrong + S.wrong, miss: S.allMiss.slice(-30),
    restarts: S.restarts, startedAt: S.firstStart };
  if (final) Object.assign(p, { stars: S.result.stars, clearedAt: Date.now(), sec: S.result.sec });
  S.pending = p; flush();
}
