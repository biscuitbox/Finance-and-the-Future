/* 금고 탈출 — 모험 지도
   세 지역(선택의 마을 → 투자의 숲과 산맥 → 미래의 항구)을 지나는 길 위에 34개 차시 금고와 단원 보스·스토리 칸을 놓는다.
   칸을 누르면 아래 안내판에 내용이 나오고 [도전하기]로 들어간다. 다음에 갈 곳에는 탐험가(🧙)가 서 있다. */
const MAP_ROWS = { 1: [4, 4], 2: [6, 6, 6, 5], 3: [4, 4] };
const MAP_HDR = 150, MAP_ROW = 175;   /* 지역 이름표 높이, 줄 간격 */
const MAP_COL = { 1: ["#e3f1cf", "#a9cf8f"], 2: ["#d2e6c3", "#8fbf7a"], 3: ["#d3e6f3", "#8fbcd9"] };
let mapSel = null, mapScrolled = false;

function mapLayout() {
  const st = [];
  [1, 2, 3].forEach(u => {
    CHAPTERS.filter(c => c.u === u).forEach(c => st.push({ kind: "ch", n: c.n, u, t: c.t }));
    (SPECIAL[u] || []).forEach(s => st.push({ kind: s.kind, n: s.n || null, u, t: s.t, ready: s.ready, id: s.id }));
  });
  let y = 30, dir = 1, i = 0;
  const regions = [];
  [1, 2, 3].forEach(u => {
    const top = y; y += MAP_HDR;
    MAP_ROWS[u].forEach(k => {
      let xs = Array.from({ length: k }, (_, j) => 130 + j * (740 / (k - 1)));
      if (dir < 0) xs.reverse();
      xs.forEach((x, j) => { const s = st[i++]; s.x = x; s.y = y + (j % 2 ? 16 : -16); s.dir = dir; s.base = y; });
      y += MAP_ROW; dir = -dir;
    });
    regions.push({ u, top, bot: y - 50 });
    y += 20;
  });
  return { st, regions, H: y + 10 };
}
function stopState(s, dex) {
  const st = stopState0(s, dex);
  return PREVIEW && st === "locked" ? "open" : st;   /* 교사 미리 보기: 잠김 없음 */
}
function stopState0(s, dex) {
  if (s.kind === "ch") return dex[s.n] ? "clear" : "open";
  if (s.kind === "boss") {
    const B0 = BOSSES.find(b => b.n === s.n), got = CHAPTERS.filter(c => c.u === s.u && dex[c.n]).length;
    s.got = got; s.need = B0.need; s.B0 = B0;
    return dex[s.n] ? "clear" : got >= B0.need ? "open" : "locked";
  }
  if (s.kind === "rpg" && s.ready) {
    const M = STORIES.find(x => x.n === s.n); if (!M) return "soon";
    s.got = M.chs.filter(n => dex[n]).length; s.need = M.need; s.M = M;
    return dex[s.n] ? "clear" : s.got >= M.need ? "open" : "locked";
  }
  return "soon";
}

function drawMap() {
  const dex = dexLocal(), L = mapLayout(), st = L.st;
  st.forEach(s => s.state = stopState(s, dex));
  const target = st.find(s => s.kind === "ch" && s.state === "open") || st.find(s => s.kind === "boss" && s.state === "open") || null;
  if (!mapSel || !st.find(s => s.kind + s.n === mapSel)) mapSel = target ? target.kind + target.n : "ch1";
  const nCh = st.filter(s => s.kind === "ch" && s.state === "clear").length, nB = st.filter(s => s.kind === "boss" && s.state === "clear").length;

  /* 길: 칸과 칸 사이를 부드럽게 잇는다. 앞 칸을 통과했으면 금빛 */
  const seg = (p, q) => p.base === q.base
    ? `M${p.x},${p.y} C${p.x + (q.x - p.x) / 3},${p.y} ${p.x + 2 * (q.x - p.x) / 3},${q.y} ${q.x},${q.y}`
    : `M${p.x},${p.y} C${p.x + p.dir * 130},${p.y} ${q.x + p.dir * 130},${q.y} ${q.x},${q.y}`;
  let paths = "";
  for (let i = 0; i < st.length - 1; i++) {
    const d = seg(st[i], st[i + 1]), done = st[i].state === "clear";
    paths += `<path d="${d}" fill="none" stroke="#b08a4e" stroke-width="22" stroke-linecap="round" opacity=".55"/>` +
      `<path d="${d}" fill="none" stroke="${done ? "#E08E0B" : "#fff8e6"}" stroke-width="${done ? 8 : 5}" stroke-linecap="round" stroke-dasharray="${done ? "0" : "2 14"}"/>`;
  }
  /* 지역 바탕·이름표·꾸밈 */
  const regs = L.regions.map(r => {
    const chs = CHAPTERS.filter(c => c.u === r.u), got = chs.filter(c => dex[c.n]).length;
    const deco = REGIONS[r.u].deco, rows = MAP_ROWS[r.u].length;
    let dec = "";
    for (let k = 0; k < rows - 1; k++) {
      /* 줄과 줄 사이, 칸과 칸의 가운데에 꾸밈 그림 (별점 글자와 겹치지 않게) */
      const yy = r.top + MAP_HDR + k * MAP_ROW + MAP_ROW / 2 + 22, kk = MAP_ROWS[r.u][k];
      const xs = Array.from({ length: kk - 1 }, (_, j) => 130 + (j + .5) * (740 / (kk - 1))).filter((_, j) => j % 2 === 0);
      xs.forEach((x, j) => { dec += `<text x="${x}" y="${yy}" font-size="32" text-anchor="middle" opacity=".55">${deco[(k * 3 + j) % deco.length]}</text>`; });
    }
    dec += `<text x="70" y="${r.top + 70}" font-size="40" opacity=".6">${deco[0]}</text><text x="930" y="${r.top + 70}" font-size="40" text-anchor="end" opacity=".6">${deco[1]}</text>`;
    return `<rect x="16" y="${r.top}" width="968" height="${r.bot - r.top}" rx="40" fill="${MAP_COL[r.u][0]}" stroke="${MAP_COL[r.u][1]}" stroke-width="4" stroke-dasharray="14 8"/>` + dec +
      `<g><rect x="250" y="${r.top + 18}" width="500" height="70" rx="16" fill="#10403B"/><rect x="250" y="${r.top + 18}" width="500" height="70" rx="16" fill="none" stroke="#E08E0B" stroke-width="4"/>
        <text x="500" y="${r.top + 50}" text-anchor="middle" font-size="27" font-weight="900" fill="#fff">${["", "Ⅰ", "Ⅱ", "Ⅲ"][r.u]}. ${esc(REGIONS[r.u].name)}</text>
        <text x="500" y="${r.top + 76}" text-anchor="middle" font-size="15" fill="#ffd27a">${esc(UNITS[r.u].replace(/^[ⅠⅡⅢ]\. /, ""))} · 금고 ${got}/${chs.length}</text></g>`;
  }).join("");
  /* 칸 */
  const nodes = st.map(s => {
    const key = s.kind + s.n, sel = key === mapSel ? " sel" : "", isT = target && target === s;
    let g = "";
    if (s.kind === "ch") {
      const d = dex[s.n], c = s.state === "clear";
      g = `<circle class="main" cx="${s.x}" cy="${s.y}" r="36" fill="${c ? "url(#gold)" : "#127475"}" stroke="${c ? "#A96A08" : "#0b5253"}" stroke-width="5"/>
        <text x="${s.x}" y="${s.y + 9}" text-anchor="middle" font-size="26" font-weight="900" fill="${c ? "#4b3605" : "#fff"}">${s.n}</text>` +
        (c ? `<text x="${s.x}" y="${s.y + 60}" text-anchor="middle" font-size="18" fill="#E08E0B" stroke="#fff8e6" stroke-width="4" paint-order="stroke">${"★".repeat(d.stars || 1)}${"☆".repeat(3 - (d.stars || 1))}</text>` : "");
    } else if (s.kind === "boss") {
      const B0 = s.B0, col = s.state === "clear" ? "url(#gold)" : s.state === "open" ? "#8C3A3A" : "#7d7068";
      g = `<g class="${s.state === "open" ? "glow" : ""}"><circle class="main" cx="${s.x}" cy="${s.y}" r="48" fill="${col}" stroke="#2a1515" stroke-width="5"/>
        <text x="${s.x}" y="${s.y + 17}" text-anchor="middle" font-size="46" opacity="${s.state === "locked" ? .45 : 1}">${B0.icon}</text></g>` +
        (s.state === "locked" ? `<text x="${s.x + 32}" y="${s.y - 26}" font-size="26">🔒</text>` : "") +
        `<text x="${s.x}" y="${s.y + 74}" text-anchor="middle" font-size="17" font-weight="900" fill="${s.state === "open" ? "#8C3A3A" : "#4b3605"}" stroke="#fff8e6" stroke-width="5" paint-order="stroke">${s.state === "clear" ? "격파! " + "★".repeat(dex[s.n].stars || 1) : s.state === "open" ? "보스 등장!" : `금고 ${s.got}/${s.need}`}</text>`;
    } else if (s.kind === "rpg" && s.state !== "soon") {
      const col = s.state === "clear" ? "url(#gold)" : s.state === "open" ? "#1C6E8C" : "#9a8fb0";
      g = `<g class="${s.state === "open" ? "glowb" : ""}"><circle class="main" cx="${s.x}" cy="${s.y}" r="44" fill="${col}" stroke="#1d2b4a" stroke-width="5"/>
        <text x="${s.x}" y="${s.y + 15}" text-anchor="middle" font-size="40" opacity="${s.state === "locked" ? .45 : 1}">${s.M.icon}</text></g>` +
        (s.state === "locked" ? `<text x="${s.x + 28}" y="${s.y - 22}" font-size="24">🔒</text>` : "") +
        `<text x="${s.x}" y="${s.y + 70}" text-anchor="middle" font-size="16" font-weight="900" fill="${s.state === "open" ? "#1C6E8C" : "#4b3605"}" stroke="#fff8e6" stroke-width="5" paint-order="stroke">${s.state === "clear" ? "완주! " + "★".repeat(dex[s.n].stars || 1) : s.state === "open" ? "이야기 시작!" : `금고 ${s.got}/${s.need}`}</text>`;
    } else {
      g = `<circle class="main" cx="${s.x}" cy="${s.y}" r="40" fill="#d9cde6" stroke="#8b78a3" stroke-width="5" stroke-dasharray="8 6"/>
        <text x="${s.x}" y="${s.y + 14}" text-anchor="middle" font-size="36" opacity=".6">🎒</text>
        <text x="${s.x}" y="${s.y + 66}" text-anchor="middle" font-size="15" font-weight="700" fill="#6d5a7c" stroke="#fff8e6" stroke-width="4" paint-order="stroke">준비 중</text>`;
    }
    const ring = isT ? `<circle class="pulse" cx="${s.x}" cy="${s.y}" r="${s.kind === "boss" ? 52 : 40}" fill="none" stroke="#E08E0B" stroke-width="6"/>` : "";
    const hero = isT ? `<text class="bob" x="${s.x}" y="${s.y - (s.kind === "boss" ? 58 : 46)}" text-anchor="middle" font-size="44">🧙</text>` : "";
    return `<g class="node${sel}" data-k="${key}"><title>${s.kind === "ch" ? s.n + "차시 · " : ""}${esc(s.t)}</title>${ring}${g}${hero}</g>`;
  }).join("");
  $("#hubbody").innerHTML = `<div class="mapstat"><span>🗺️ 탐험한 금고 <b>${nCh}</b> / 34</span><span>👾 쓰러뜨린 보스 <b>${nB}</b> / 3</span><span>🧙 = 다음에 갈 곳 · 칸을 눌러 보세요</span></div>
    <div class="advmap"><svg viewBox="0 0 1000 ${L.H}" role="img" aria-label="모험 지도">
      <defs><radialGradient id="gold" cx=".35" cy=".3"><stop offset="0" stop-color="#ffe8a8"/><stop offset=".6" stop-color="#f5bf45"/><stop offset="1" stop-color="#d99a14"/></radialGradient></defs>
      ${regs}${paths}${nodes}</svg></div>
    <div class="mapinfo" id="mi"></div>`;
  const byKey = Object.fromEntries(st.map(s => [s.kind + s.n, s]));
  const info = () => {
    const s = byKey[mapSel]; if (!s) return;
    let ic, sm, ti, extra = "", btn = "";
    if (s.kind === "ch") {
      const d = dex[s.n];
      ic = d ? "🔓" : "🔒"; sm = `${REGIONS[s.u].name} · ${s.n}차시 금고`; ti = s.t;
      extra = d ? `<span>${"★".repeat(d.stars || 1)}${"☆".repeat(3 - (d.stars || 1))}</span> 연 금고 — 다시 하면 연습이에요` : "아직 열지 않은 금고";
      btn = `<button class="btn big ${d ? "" : "amber"}" id="mgo">${d ? "다시 보기" : "도전하기"} ▶</button>`;
    } else if (s.kind === "boss") {
      ic = s.B0.icon; sm = `${REGIONS[s.u].name} · 단원 보스`; ti = s.B0.name;
      extra = s.state === "clear" ? `<span>${"★".repeat(dex[s.n].stars || 1)}</span> 쓰러뜨린 보스` : s.state === "open" ? "길을 막고 있어요! 이 지역 금고 문제로 전투해요" : `이 지역 금고를 ${s.need}개 열면 나타나요 (지금 ${s.got}개)`;
      btn = s.state === "locked" ? "" : `<button class="btn big ${s.state === "open" ? "amber" : ""}" id="mgo">${s.state === "open" ? "전투 시작 ⚔️" : "다시 싸우기 ▶"}</button>`;
    } else if (s.kind === "rpg" && s.state !== "soon") {
      const d = dex[s.n];
      ic = s.M.icon; sm = `${REGIONS[s.u].name} · 스토리 게임`; ti = s.M.t;
      extra = s.state === "clear" ? `<span>${"★".repeat(d.stars || 1)}</span> ${esc((d.term || "").split(" · ")[1] || "완주")} — 다른 엔딩도 찾아보세요` : s.state === "open" ? "준서가 되어 한 달 동안 용돈으로 살아남기!" : `${s.M.chs.map(n => n + "차시").join("·")} 금고를 ${s.need}개 열면 시작해요 (지금 ${s.got}개)`;
      btn = s.state === "locked" ? "" : `<button class="btn big ${s.state === "open" ? "amber" : ""}" id="mgo">${s.state === "open" ? "이야기 시작 ▶" : "다시 하기 ▶"}</button>`;
    } else { ic = "🎒"; sm = `${REGIONS[s.u].name} · 스토리 게임`; ti = s.t; extra = "준비 중이에요"; }
    $("#mi").innerHTML = `<div class="ic">${ic}</div><div class="tx"><small>${esc(sm)}</small><b>${esc(ti)}</b>${extra}</div>${btn}`;
    const go = $("#mgo"); if (go) go.onclick = () => location.hash = s.kind === "ch" ? "ch" + s.n : s.kind === "rpg" ? "story" + s.u : "boss" + s.u;
  };
  info();
  document.querySelectorAll(".advmap .node").forEach(g => g.onclick = () => {
    if (mapSel === g.dataset.k) { const go = $("#mgo"); if (go) go.click(); return; }   // 같은 칸을 두 번 누르면 바로 들어감
    mapSel = g.dataset.k;
    document.querySelectorAll(".advmap .node").forEach(x => x.classList.toggle("sel", x === g));
    info(); beep("tick");
  });
  if (!mapScrolled && target) {
    mapScrolled = true;
    const sel = `.advmap .node[data-k="${target.kind + target.n}"]`, el = document.querySelector(sel);
    /* 아래 안내판(약 120px)에 가리면 그 칸이 화면 가운데 오도록 (다시 그려진 뒤의 칸을 찾아서) */
    if (el && el.getBoundingClientRect().bottom > innerHeight - 170) setTimeout(() => { const e2 = document.querySelector(sel); if (e2) e2.scrollIntoView({ block: "center", behavior: "smooth" }); }, 400);
  }
}
