/* 금고 탈출 — 스토리 RPG (선택 결과형 + 지식 문제)
   · 이야기 데이터는 data/storyN.js 의 STORY({...}) (형식은 그 파일 머리말)
   · 상태판(지갑·통장·만족·신용)이 선택마다 바뀌고, 마지막 상태로 엔딩이 정해짐. 별은 지식 문제 정답 수
   · 기록 번호 38(Ⅱ편)·39(Ⅲ편). 저장은 본문의 flush()를 그대로 씀
   이 파일은 index.html 본문 스크립트보다 먼저 읽히지만, 함수 안에서만 본문의 $·esc·R·fmt 등을 쓴다. */
window.STORYDATA = window.STORYDATA || {};
function STORY(d) { STORYDATA[d.n] = d; }
function loadStory(meta) {
  return new Promise((res, rej) => {
    if (STORYDATA[meta.n]) return res(STORYDATA[meta.n]);
    const s = document.createElement("script"); s.src = `data/${meta.file}.js`;
    s.onload = () => STORYDATA[meta.n] ? res(STORYDATA[meta.n]) : rej(new Error("no data"));
    s.onerror = () => rej(new Error("load fail")); document.head.appendChild(s);
  });
}
/* 이야기마다 다른 화면 글 (data 의 ui 로 바꿈). money: "won"(원) 또는 "man"(만 원 단위 → 억 원까지) */
const SUI0 = { intro: "나는 중학생 준서!", span: "한 달(4주) 동안", periods: null, timeIc: "📅",
  lab: { wallet: "💵 지갑", bank: "🏦 통장 (저축)", joy: "😊 만족", trust: "🤝 신용" },
  fin: { wallet: "💵 남은 지갑", bank: "🏦 통장", joy: "😊 만족", trust: "🤝 신용" },
  balance: "즐거움과 저축, 약속 사이에서", endHead: "한 달 결과", endBtn: "한 달 결과 보기 ▶", review: "준서의 한 달 돌아보기", money: "won" };
const SUI = D => { const u = D.ui || {}; return { ...SUI0, ...u, lab: { ...SUI0.lab, ...(u.lab || {}) }, fin: { ...SUI0.fin, ...(u.fin || {}) } }; };
function smoney(D, v) {
  if (SUI(D).money !== "man") return fmt(v) + "원";
  const a = Math.abs(v), e = Math.floor(a / 10000), r = a % 10000, sg = v < 0 ? "−" : "";
  if (!a) return "0원";
  return sg + (e ? `${e}억${r ? " " + fmt(r) + "만" : ""} 원` : `${fmt(r)}만 원`);
}
const speriod = (D, sc) => { const P = SUI(D).periods; return P ? `${P[sc.week - 1]} · ${sc.day}` : `${sc.week}주차 ${sc.day}`; };
const storyQuizCount = D => D.scenes.filter(sc => sc.quiz || sc.type === "number").length;
const storyStars = (D, right) => { const q = storyQuizCount(D); return right >= q ? 3 : right >= q - 2 ? 2 : 1; };

/* ---------- 입구 ---------- */
async function viewStory(u) {
  const M = STORIES.find(x => x.u === u); if (!M) { location.hash = ""; return; }
  const m = me();
  $("#app").innerHTML = topbar() + `<div class="wrap" style="color:#fff">이야기를 펼치는 중…</div>`; bindTop();
  await syncDex();
  const dex = dexLocal(), got = M.chs.filter(n => PREVIEW || dex[n]);
  let D; try { D = await loadStory(M); } catch (e) { $("#app").innerHTML = topbar() + `<div class="wrap" style="color:#fff">이야기를 불러오지 못했어요. <a href="#" style="color:#ffd27a">모험 지도로</a></div>`; return; }
  if (got.length < M.need) {
    $("#app").innerHTML = topbar() + `<div class="intro"><span class="qtag">스토리 게임 · ${esc(REGIONS[u].name)}</span><h1>${M.icon} 아직 잠겨 있어요</h1>
      <div class="story">「${esc(D.title)}」는 ${M.chs.map(n => n + "차시").join("·")} 금고 가운데 <b>${M.need}개 이상</b> 열면 시작할 수 있어요. 지금 <b>${got.length}개</b> 열었어요.</div>
      <div class="act"><a class="btn big" href="#" style="text-decoration:none">모험 지도로</a></div></div>`;
    bindTop(); return;
  }
  let rec = null, cls = null, offline = false;
  if (!PREVIEW) try { [cls, rec] = await Promise.all([DB.getClass(m.code), DB.getRecord(m.code, M.n, m.num)]); } catch (e) { offline = true; }
  if (rec && rec._foreign) return viewBlocked({ n: M.n }, "foreign");
  if (cls === null && !offline && !PREVIEW) return viewBlocked({ n: M.n }, "noclass");
  const closed = cls && cls.open === false, cleared = rec && rec.status === "cleared";
  setGate(cls);
  if (!cleared && !(rec && rec.status === "playing") && gateWhy(M.n)) return viewGated(`스토리 게임 「${M.t}」`);
  if (cleared) dexPut(M.n, { term: `${D.title} · ${rec.endingT || "완주"}`, icon: rec.endingIcon || M.icon, line: rec.endingLine || "", stars: rec.stars });
  const q = storyQuizCount(D);
  $("#app").innerHTML = topbar() + `<div class="intro">
    <span class="qtag">스토리 게임 · ${esc(REGIONS[u].name)}</span><h1>${M.icon} ${esc(D.title)} <small style="font-size:20px;color:var(--grey)">${esc(D.sub)}</small></h1>
    <div class="story">${D.hero} ${esc(SUI(D).intro)} ${esc(D.goal)}</div>
    <ul><li>${esc(SUI(D).span)} 일어나는 일마다 <b>무엇을 할지 골라요.</b> 고른 것에 따라 ${Object.values(SUI(D).lab).map(esc).join(" · ")}${iga(SUI(D).lab.trust)} 바뀌어요.</li>
      <li>배운 내용을 묻는 <b>지식 문제 ${q}개</b>가 숨어 있어요. 틀려도 이야기는 이어지지만, 이야기 속에서 손해를 봐요. 별은 지식 문제 정답 수로 정해져요.</li>
      <li>정답이 없는 선택도 있어요. ${esc(SUI(D).balance)} <b>균형</b>을 잡아 보세요. 마지막 상태에 따라 <b>엔딩이 5가지</b>로 달라져요.</li>
      <li>대사 상자를 누르거나 Space를 누르면 빨리 넘어가요.</li></ul>
    ${cleared ? `<div class="demo">이미 끝낸 이야기예요 (${esc(rec.endingT || "")} ${"★".repeat(rec.stars || 1)}). 다시 하면 <b>연습</b>이라 기록은 바뀌지 않아요. 다른 선택으로 다른 엔딩을 찾아보세요!</div>` : ""}
    ${PREVIEW ? PV_NOTE : ""}
    ${closed && !cleared ? `<div class="demo">선생님이 지금은 기록을 닫아 두었어요. <b>연습</b>으로만 할 수 있어요.</div>` : ""}
    ${offline ? `<div class="demo">인터넷 연결이 불안정해요. 게임은 할 수 있고, 연결되면 기록을 다시 보내요.</div>` : ""}
    <div class="act"><button class="btn big amber" id="start">${PREVIEW ? "미리 해 보기" : cleared || closed ? "연습으로 시작" : "이야기 시작"} ▶</button><a class="btn big ghost" style="color:var(--pine);text-decoration:none" href="#">모험 지도</a></div></div>`;
  bindTop();
  $("#start").onclick = () => startStory(M, D, rec, cleared || closed || PREVIEW);
}

/* ---------- 시작 ---------- */
let SBID = 0;
function startStory(M, D, rec, practice) {
  S = {
    sbid: ++SBID, g: { n: M.n, title: D.title }, meta: M, D, practice, phase: "story",
    st: { ...D.start, flags: {} }, i: 0, quiz: {}, picks: [], right: 0, wrong: 0,
    startedAt: Date.now(), firstStart: (rec && rec.startedAt) || Date.now(),
    restarts: practice ? 0 : rec && rec.status === "playing" ? (rec.restarts || 0) + 1 : (rec && rec.restarts) || 0,
    saveState: practice ? "practice" : "idle", pending: null
  };
  $("#app").innerHTML = topbar(`<span class="pill">${M.icon} ${esc(D.title)}${practice ? '<span class="badge">연습</span>' : ""}</span><span class="pill">⏱ <span id="elapsed">0분 0초</span></span><span class="pill" id="sv"></span>`) +
    `<div class="sgame"><div class="shud" id="hud"></div>
      <div class="sstage w1" id="stage"></div>
      <div class="sbox" id="msg"></div>
      <div class="schoice" id="sc"></div></div>`;
  bindTop(); drawHud(); drawSave();
  saveStory(false);
  const tick = setInterval(() => { const e = $("#elapsed"); if (e) e.textContent = mmss(Math.floor((Date.now() - S.startedAt) / 1000)); }, 1000);
  cleanup = () => clearInterval(tick);
  bindTellKeys();
  playScene(S.sbid, 0);
}
const salive = sbid => S && S.sbid === sbid && document.getElementById("stage");

/* ---------- 상태판 ---------- */
function drawHud() {
  const D = S.D, U = SUI(D), s = S.st, sc = D.scenes[Math.min(S.i, D.scenes.length - 1)], wk = sc ? sc.week : 4;
  const g = v => v <= 30 ? "low" : v <= 50 ? "mid" : "";
  $("#hud").innerHTML = `<div class="it wk"><small>${U.timeIc} ${esc(sc ? speriod(D, sc) : "")}</small><div class="dots">${[1, 2, 3, 4].map(w => `<span class="${w <= wk ? "on" : ""}"></span>`).join("")}</div></div>
    <div class="it" id="h-wallet"><small>${esc(U.lab.wallet)}</small><b>${smoney(D, s.wallet)}</b></div>
    <div class="it" id="h-bank"><small>${esc(U.lab.bank)}</small><b>${smoney(D, s.bank)}</b></div>
    <div class="it" id="h-joy"><small>${esc(U.lab.joy)}</small><b>${s.joy}</b><div class="gb"><i class="${g(s.joy)}" style="width:${s.joy}%"></i></div></div>
    <div class="it" id="h-trust"><small>${esc(U.lab.trust)}</small><b>${s.trust}</b><div class="gb"><i class="${g(s.trust)}" style="width:${s.trust}%"></i></div></div>`;
}
/* 선택 결과를 상태에 더함. 지갑이 모자라면 통장에서 꺼내고 안내 글을 돌려줌 */
function applyFx(fx = {}) {
  const s = S.st, before = { wallet: s.wallet, bank: s.bank, joy: s.joy, trust: s.trust };
  for (const k of ["wallet", "bank", "joy", "trust"]) if (fx[k]) s[k] += fx[k];
  s.joy = Math.max(0, Math.min(100, s.joy)); s.trust = Math.max(0, Math.min(100, s.trust));
  let note = "";
  if (s.wallet < 0) {
    const lack = -s.wallet; s.bank -= lack; s.wallet = 0;
    note = `${SUI(S.D).lab.wallet.replace(/^\S+\s/, "")}이 모자라 ${SUI(S.D).lab.bank.replace(/^\S+\s/, "").replace(/ \(.*\)$/, "")}에서 ${smoney(S.D, lack)}을 꺼냈어요.` + (s.flags.deposit ? " 정기 예금을 중간에 깨면 약속한 이자를 거의 받지 못해요. (19차시)" : "");
  }
  if (s.bank < 0) s.bank = 0;
  drawHud();
  for (const k of ["wallet", "bank", "joy", "trust"]) {
    const d = s[k] - before[k]; if (!d) continue;
    const el = $("#h-" + k); if (!el) continue;
    const t = document.createElement("span"); t.className = "delta " + (d > 0 ? "up" : "down");
    t.textContent = (d > 0 ? "+" : "−") + (k === "wallet" || k === "bank" ? smoney(S.D, Math.abs(d)) : Math.abs(d));
    el.appendChild(t); setTimeout(() => t.remove(), 1700);
  }
  if (Object.values(fx).some(v => v < 0)) beep("bad"); else if (Object.values(fx).some(v => v > 0)) beep("ok");
  return note;
}

/* ---------- 대사 (한 글자씩, 누르면 넘어감) ---------- */
let tellTap = null;
async function tell(text, who = "", hold = null) {
  const sbid = S && S.sbid, el = $("#msg"); if (!el) return;
  const chars = Array.from(text);
  el.innerHTML = `${who ? `<span class="nm">${esc(who)}</span>` : ""}<span class="mtext" id="mtx">${chars.map(c => `<span class="ch">${esc(c)}</span>`).join("")}</span><span class="caret wait">▼</span>`;
  const cs = $("#mtx").children; let i = 0, skip = false;
  tellTap = () => { skip = true; };
  while (i < cs.length) { if (!salive(sbid)) return; if (skip) { for (; i < cs.length; i++) cs[i].classList.add("on"); break; } cs[i++].classList.add("on"); if (i < cs.length) await sleep(SAY_CHAR); }
  const c = el.querySelector(".caret"); if (c) c.classList.remove("wait");
  const wait = hold == null ? Math.min(SAY_MAX, SAY_BASE + chars.length * SAY_PER) : hold;   /* 보스전 대사와 같은 속도 */
  await new Promise(r => { const t = setTimeout(r, wait); tellTap = () => { clearTimeout(t); r(); }; });
  tellTap = null;
}
function bindTellKeys() {
  $("#msg").onclick = () => { if (tellTap) tellTap(); };
  const kh = e => { if ((e.key === " " || e.key === "Enter") && tellTap && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); tellTap(); } };
  document.addEventListener("keydown", kh);
  const pc = cleanup; cleanup = () => { document.removeEventListener("keydown", kh); tellTap = null; pc(); };
}

/* ---------- 장면 ---------- */
async function playScene(sbid, i) {
  if (!salive(sbid)) return;
  const D = S.D;
  if (i >= D.scenes.length) return storyEnd();
  S.i = i; S.phase = "scene";
  const sc = D.scenes[i];
  drawHud();
  const npc = sc.cast && sc.cast[1];
  $("#stage").className = "sstage w" + sc.week;
  $("#stage").innerHTML = `<div class="bgic">${sc.place}</div><div class="where"><b>${esc(speriod(D, sc))}</b>${sc.place} ${esc(sc.where)}</div>
    <div class="who l enter" id="whoL">${(sc.cast && sc.cast[0]) || D.hero}</div>${npc ? `<div class="who r enter" id="whoR">${npc}</div>` : ""}`;
  $("#sc").innerHTML = "";
  const run = sc.event ? sc.run(S.st) : null;
  const lines = run ? run.lines : sc.lines || [];
  for (const [who, t] of lines) {
    const side = who === "준서" ? $("#whoL") : $("#whoR");
    if (side) { side.classList.remove("talk"); void side.offsetWidth; side.classList.add("talk"); }
    await tell(t, who); if (!salive(sbid)) return;
  }
  if (run) {   /* 사건: 저절로 일어남 */
    const note = applyFx(run.fx);
    S.picks.push({ i, tag: run.tag || "사건" });
    return showResult(sbid, "n", "일이 일어났어요!", run.res, note);
  }
  const box = $("#sc");
  if (sc.type === "number") {
    box.innerHTML = `<div class="ask"><span class="qbadge">지식 문제</span>${esc(sc.ask)}</div>
      <div class="numrow"><input class="numin" id="numin" inputmode="numeric" autocomplete="off" placeholder="숫자"><span class="u">${esc(sc.unit || "")}</span><button class="btn big" id="sub" disabled>확인</button></div>`;
    const inp = $("#numin");
    inp.oninput = () => $("#sub").disabled = !inp.value.trim();
    inp.onkeydown = e => { if (e.key === "Enter" && inp.value.trim()) $("#sub").click(); };
    $("#sub").onclick = () => { const x = parseNum(inp.value); if (x === null) { toast("숫자로 써 주세요."); return; } pickNumber(sbid, sc, x); };
    setTimeout(() => inp.focus(), 50);
    return;
  }
  const opts = sc.options.map((o, k) => ({ o, k }));
  const order = sc.quiz ? R.shuffle(opts) : opts;
  box.innerHTML = `<div class="ask">${sc.quiz ? '<span class="qbadge">지식 문제</span>' : ""}${esc(sc.ask)}</div><div class="opts2">${order.map(({ o, k }, j) => {
    const lack = o.cost && o.cost > S.st.wallet, lackB = o.needBank && o.needBank > S.st.bank;
    const lw = n => SUI(D).lab[n].replace(/^\S+\s/, "").replace(/ \(.*\)$/, "");
    return `<button class="op" data-k="${k}" ${lack || lackB ? "disabled" : ""}><span class="k">${"ABCD"[j]}</span>${esc(o.t)}${lack ? `<span class="c">${esc(lw("wallet"))}이 모자라요</span>` : lackB ? `<span class="c">${esc(lw("bank"))}이 ${smoney(D, o.needBank)} 있어야 해요</span>` : o.cost ? `<span class="c">−${smoney(D, o.cost)}</span>` : ""}</button>`; }).join("")}</div>`;
  box.querySelectorAll(".op").forEach(b => b.onclick = () => pickOption(sbid, sc, sc.options[+b.dataset.k]));
}
function pickOption(sbid, sc, o) {
  if (S.phase !== "scene") return; S.phase = "result";
  if (o.flag) S.st.flags[o.flag] = true;
  const note = applyFx(o.fx);
  S.picks.push({ i: S.i, tag: o.tag || o.t, ok: sc.quiz ? !!o.ok : undefined });
  if (sc.quiz) { S.quiz[sc.id] = o.ok ? 1 : 0; if (o.ok) S.right++; else S.wrong++; }
  saveStory(false);
  showResult(sbid, sc.quiz ? (o.ok ? "ok" : "bad") : "n", sc.quiz ? (o.ok ? "정답! 👍" : "앗, 아쉬워요 😥") : "결과", o.res, note);
}
function pickNumber(sbid, sc, x) {
  if (S.phase !== "scene") return; S.phase = "result";
  const ok = x === sc.answer || (sc.accept || []).includes(x);
  S.quiz[sc.id] = ok ? 1 : 0; if (ok) S.right++; else S.wrong++;
  const tag = (sc.accept || []).includes(x) ? fmt(x) + "원" : sc.unit === "만 원" && SUI(S.D).money === "man" ? smoney(S.D, x) : `${fmt(x)}${sc.unit || ""}`;
  S.picks.push({ i: S.i, tag, ok });
  beep(ok ? "ok" : "bad");
  saveStory(false);
  showResult(sbid, ok ? "ok" : "bad", ok ? "정답! 👍" : "앗, 아쉬워요 😥", ok ? sc.okRes : sc.badRes, "");
}
function showResult(sbid, kind, head, text, note) {
  S.phase = "result";
  const last = S.i >= S.D.scenes.length - 1;
  $("#sc").innerHTML = `<div class="res ${kind}"><h4>${esc(head)}</h4>${esc(text || "")}${note ? `<span class="note">${esc(note)}</span>` : ""}</div>
    <div class="row"><button class="btn big amber" id="nx">${last ? esc(SUI(S.D).endBtn) : "다음 ▶"}</button></div>`;
  $("#sc").scrollIntoView({ block: "nearest", behavior: "smooth" });
  saveStory(false);
  $("#nx").onclick = () => { if (S.phase !== "result") return; playScene(sbid, S.i + 1); };
  $("#nx").focus();
}

/* ---------- 엔딩 ---------- */
function storyEnd() {
  S.phase = "done";
  const D = S.D, U = SUI(D), s = S.st, E = D.endings.find(e => e.when(s)), stars = storyStars(D, S.right), q = storyQuizCount(D);
  const sec = Math.floor((Date.now() - S.startedAt) / 1000);
  S.result = { stars, sec, E };
  if (!S.practice) { dexPut(D.n, { term: `${D.title} · ${E.t}`, icon: E.icon, line: E.line, stars, at: Date.now(), loc: Date.now() }); saveStory(true); }
  else if (PREVIEW) dexPut(D.n, { term: `${D.title} · ${E.t}`, icon: E.icon, line: E.line, stars, at: Date.now() });
  cleanup(); beep("open");
  $("#app").innerHTML = topbar() + `<div class="send">
    <div style="font-size:18px;color:#b9d3cf">${S.meta.icon} ${esc(D.title)} · ${esc(U.endHead)}${S.practice ? '<span class="badge">연습</span>' : ""}</div>
    <div class="eic">${E.icon}</div><h1>${esc(E.t)}</h1><p class="ln">${esc(E.line)}</p>
    <div class="bigstars">${starTxt(stars)}</div><div style="color:#b9d3cf">지식 문제 ${S.right} / ${q} 정답</div>
    <div class="fin"><div><b>${smoney(D, s.wallet)}</b><span>${esc(U.fin.wallet)}</span></div><div><b>${smoney(D, s.bank)}</b><span>${esc(U.fin.bank)}</span></div><div><b>${s.joy}</b><span>${esc(U.fin.joy)}</span></div><div><b>${s.trust}</b><span>${esc(U.fin.trust)}</span></div></div>
    <div class="path"><h3>📜 ${esc(U.review)}</h3><ol>${S.picks.map(p => { const sc = D.scenes[p.i];
      return `<li>${esc(speriod(D, sc))} ${sc.place} ${esc(sc.where)} — <span class="${p.ok === true ? "o" : p.ok === false ? "x" : ""}">${esc(p.tag)}${p.ok === true ? " ✓" : p.ok === false ? " ✗" : ""}</span></li>`; }).join("")}</ol></div>
    <p class="saved" id="savedmsg">${PREVIEW ? "교사 미리 보기라 기록은 남지 않아요." : S.practice ? "연습이라 기록은 바뀌지 않았어요." : "기록을 보내는 중…"}</p>
    <p style="color:#b9d3cf">엔딩은 5가지예요. 다른 선택을 하면 다른 결말을 볼 수 있어요.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button class="btn big amber" id="again">다시 해 보기 (연습)</button><a class="btn big" href="#dex" style="text-decoration:none">📒 내 도감</a><a class="btn big" href="#" style="text-decoration:none">🗺️ 모험 지도</a></div></div>`;
  bindTop(); drawSave();
  $("#again").onclick = () => startStory(S.meta, D, null, true);
}
function saveStory(final) {
  if (S.practice) return;
  if (S.pending && S.pending.status === "cleared" && !final) return;
  const s = S.st;
  const p = { status: final ? "cleared" : "playing", locks: [], firstOk: S.right, wrong: S.wrong, quiz: S.quiz,
    picks: S.picks.map(x => x.tag).slice(0, 30), step: S.i + 1, final: { wallet: s.wallet, bank: s.bank, joy: s.joy, trust: s.trust },
    restarts: S.restarts, startedAt: S.firstStart };
  if (final) Object.assign(p, { stars: S.result.stars, sec: S.result.sec, clearedAt: Date.now(), ending: S.result.E.id, endingT: S.result.E.t, endingIcon: S.result.E.icon, endingLine: S.result.E.line });
  S.pending = p; flush();
}
