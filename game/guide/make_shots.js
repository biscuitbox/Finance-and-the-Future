/* 교사용 사용 설명서 그림 만들기 (체험 모드 데이터를 실제 학급처럼 바꿔서 찍음) */
const { chromium } = require('playwright'); const path = require('path'), http = require('http'), fs = require('fs');
/* 사용법: 저장소 루트에서  node game/guide/make_shots.js  → game/guide/raw/*.png 생성 → 아래 README대로 webp로 바꿈 */
const root = process.argv[2] || process.cwd(), OUT = path.join(root, 'game/guide/raw');
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  if (p.endsWith('firebase-config.js')) { r.writeHead(200, { 'Content-Type': 'text/javascript' }); r.end('window.FIREBASE_CONFIG=null;'); return; }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8780);
const T = 'http://localhost:8780/game/teacher.html', G = 'http://localhost:8780/game/index.html';
const CODE = 'K7M3QP';
/* 체험용 표시 숨기기 + 이름 바꾸기 */
const POLISH = `(() => {
  document.querySelectorAll('.demo').forEach(e => e.remove());
  const rs = document.getElementById('rs'); if (rs) { const h = rs.previousElementSibling; if (h && h.tagName === 'H4') h.remove(); rs.remove(); }
  const who = document.getElementById('who'); if (who && who.textContent) who.textContent = '김금융 선생님 · teacher@school.example';
  const inb = document.getElementById('in'); if (inb) inb.textContent = '구글 계정으로 로그인';
  document.querySelectorAll('td').forEach(e => { if (e.textContent.trim() === 'demo@example.com') e.textContent = 'teacher@school.example'; });
  document.querySelectorAll('.mark').forEach(e => e.remove());
})()`;
/* 번호 표시(①②…)를 요소 옆에 붙이기 */
async function marks(pg, list) {
  await pg.evaluate(list => {
    list.forEach(([sel, n, pos]) => {
      const el = typeof sel === 'string' ? document.querySelector(sel) : null; if (!el) return;
      const r = el.getBoundingClientRect(), m = document.createElement('div'); m.className = 'mark'; m.textContent = n;
      Object.assign(m.style, { position: 'absolute', zIndex: 99999, width: '38px', height: '38px', borderRadius: '50%', background: '#E08E0B', color: '#fff', font: '900 22px "Malgun Gothic",sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', boxShadow: '0 3px 8px rgba(0,0,0,.4)' });
      const x = pos === 'r' ? r.right + 6 : pos === 'l' ? r.left - 46 : r.left - 10, y = pos === 'r' || pos === 'l' ? r.top + r.height / 2 - 19 : r.top - 16;
      m.style.left = (x + scrollX) + 'px'; m.style.top = (y + scrollY) + 'px'; document.body.appendChild(m);
      const box = document.createElement('div'); box.className = 'mark';
      Object.assign(box.style, { position: 'absolute', zIndex: 99998, left: (r.left + scrollX - 4) + 'px', top: (r.top + scrollY - 4) + 'px', width: (r.width + 8) + 'px', height: (r.height + 8) + 'px', border: '4px solid #E08E0B', borderRadius: '12px', pointerEvents: 'none' });
      document.body.appendChild(box);
    });
  }, list);
}
async function shot(pg, name, clip) { await pg.waitForTimeout(250); await pg.screenshot({ path: `${OUT}/${name}.png`, clip, fullPage: !clip && false }); console.log('shot', name); }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  /* 1) 체험 데이터 준비: 반 이름·코드, 여러 차시·보스 기록 */
  await pg.goto(T); await pg.waitForTimeout(800);
  await pg.evaluate(CODE => {
    const s = JSON.parse(localStorage.getItem('fg_demo_v1'));
    const c = s.classes.DEMO01; delete s.classes.DEMO01;
    s.classes[CODE] = { ...c, name: '2학년 1반', school: '○○중학교', ownerName: '김금융', size: 24 };
    const recs = s.records.DEMO01; delete s.records.DEMO01;
    s.teachers['demo@example.com'].name = '김금융'; s.teachers['demo@example.com'].school = '○○중학교';
    s.teachers['lee.teacher@school.example'] = { name: '이저축', school: '○○중학교', admin: false };
    const now = Date.now(), rnd = k => (Math.sin(k * 9301 + 49297) + 1) / 2;
    const writing = { 1: '금리가 오르면 우리 집 대출 이자가 늘어서 외식을 줄여야 할 것 같다.', 2: '나중에 고등학생이 되면 소비 금융보다 저축을 먼저 해야겠다.', 3: '어제 게임 대신 숙제를 골랐는데 기회비용은 친구와 노는 시간이었다.' };
    for (let ch = 1; ch <= 3; ch++) for (let num = 1; num <= 24; num++) {
      const v = rnd(ch * 100 + num); if (v < .18) continue;
      const cleared = v > .3, fo = cleared ? 2 + Math.floor(rnd(ch * 7 + num) * 4) : 1;
      recs[`${ch}_${String(num).padStart(2, '0')}`] = { ch, num: String(num).padStart(2, '0'), uid: 'demo-other-' + num, status: cleared ? 'cleared' : 'playing',
        locks: [0, 1, 2, 3, 4].map(i => ({ tries: i < fo || !cleared ? 1 : 2, ok: cleared || i < 2, firstOk: i < fo })), firstOk: fo, wrong: cleared ? 5 - fo : 1,
        stars: fo >= 5 ? 3 : fo >= 3 ? 2 : 1, writing: cleared ? writing[ch] : '', restarts: 0, startedAt: now - 86400000 * (4 - ch), updatedAt: now, clearedAt: cleared ? now - 86400000 * (4 - ch) : null, sec: 300 + Math.floor(v * 400) };
    }
    [[3, 'cleared', 2, [12, 17]], [5, 'cleared', 3, []], [7, 'playing', 0, [18, 18, 13]], [8, 'cleared', 1, [17, 13, 18, 10]], [12, 'cleared', 2, [18]]].forEach(([num, st, stars, miss]) => {
      recs[`36_${String(num).padStart(2, '0')}`] = { ch: 36, num: String(num).padStart(2, '0'), uid: 'demo-other-' + num, status: st, locks: [], firstOk: st === 'cleared' ? 10 : 6, wrong: miss.length, miss,
        stars: st === 'cleared' ? stars : null, restarts: miss.length > 2 ? 1 : 0, startedAt: now - 3600000, updatedAt: now, clearedAt: st === 'cleared' ? now : null, sec: st === 'cleared' ? 420 + num * 11 : null };
    });
    s.records[CODE] = recs;
    localStorage.setItem('fg_demo_v1', JSON.stringify(s));
    localStorage.setItem('fg_t_ch', '18'); localStorage.setItem('fg_t_guide_hide', 'true');
  }, CODE);

  /* 2) 교사: 로그인 화면 */
  await pg.goto(T); await pg.waitForTimeout(700);
  if (await pg.$('#out:not(.hide)')) { await pg.click('#out'); await pg.waitForTimeout(500); }
  await pg.evaluate(POLISH); await shot(pg, 't01_login', { x: 0, y: 0, width: 1280, height: 520 });
  /* 등록 안 된 선생님 화면 */
  await pg.evaluate(() => { U = { email: 'new.teacher@school.example' }; viewUnregistered(); }); await pg.evaluate(POLISH); await shot(pg, 't02_unregistered', { x: 0, y: 0, width: 1280, height: 420 });
  /* 로그인 → 반 화면 */
  await pg.goto(T); await pg.waitForTimeout(500); await pg.click('#in'); await pg.waitForTimeout(900);
  const cls = await pg.$('text=2학년 1반'); if (cls) await cls.click(); await pg.waitForTimeout(700);
  await pg.evaluate(POLISH);
  await marks(pg, [['#newc', '1', 'r'], ['.code', '2', 'r'], ['#cp', '3', 'r'], ['#chs', '4', 't'], ['.tabs', '5', 't']]);
  await shot(pg, 't04_class_overview', { x: 0, y: 0, width: 1280, height: 800 });
  await pg.evaluate(POLISH);
  /* 새 반 만들기 */
  await pg.click('#newc'); await pg.waitForTimeout(500); await pg.evaluate(POLISH);
  const ins = await pg.$$('#main input'); if (ins[0]) await ins[0].fill('2학년 3반'); if (ins[1]) await ins[1].fill('○○중학교'); if (ins[2]) await ins[2].fill('26');
  await shot(pg, 't03_newclass', { x: 0, y: 0, width: 1280, height: 640 });
  /* 다시 반 화면: 현황 탭(18차시) */
  const cls2 = await pg.$('text=2학년 1반'); if (cls2) await cls2.click(); await pg.waitForTimeout(800); await pg.evaluate(POLISH);
  await pg.evaluate(() => scrollTo(0, 0));
  const hb = await pg.$('.chead'); const hbb = await hb.boundingBox();
  await marks(pg, [['#op', '1', 't'], ['#sz', '2', 't'], ['#dc', '3', 't']]);
  await shot(pg, 't05_classbuttons', { x: hbb.x - 20, y: hbb.y - 26, width: hbb.width + 60, height: hbb.height + 40 });
  await pg.evaluate(POLISH);
  await pg.evaluate(() => { const b = document.querySelector('#body'); b.scrollIntoView(); scrollBy(0, -140); });
  await pg.waitForTimeout(300);
  await marks(pg, [['.sum', '1', 't'], ['.bars', '2', 't']]);
  await shot(pg, 't06_now_summary');
  await pg.evaluate(POLISH);
  await pg.evaluate(() => { const t = document.querySelector('#body table'); t.scrollIntoView(); scrollBy(0, -60); });
  await pg.waitForTimeout(300);
  await marks(pg, [['#body td.lks', '1', 't'], ['#body [data-del]', '2', 'l']]);
  await shot(pg, 't07_now_students');
  await pg.evaluate(POLISH);
  /* 마지막 방 글 */
  await pg.evaluate(() => scrollTo(0, 0));
  await pg.click('button[data-t="wall"]'); await pg.waitForTimeout(500); await pg.evaluate(POLISH);
  await shot(pg, 't08_wall');
  /* 전 차시 한눈에 */
  await pg.click('button[data-t="all"]'); await pg.waitForTimeout(500); await pg.evaluate(POLISH);
  await shot(pg, 't09_all');
  /* TV 진행판 */
  await pg.click('button[data-t="now"]'); await pg.waitForTimeout(400);
  await pg.click('#tvb'); await pg.waitForTimeout(600); await shot(pg, 't10_tv');
  await pg.click('#tvx'); await pg.waitForTimeout(300);
  /* 보스전 현황 */
  await pg.selectOption('#chs', '36'); await pg.waitForTimeout(700); await pg.evaluate(POLISH);
  await pg.evaluate(() => { document.querySelector('#body').scrollIntoView(); scrollBy(0, -150); }); await pg.waitForTimeout(300);
  await shot(pg, 't11_boss');
  await pg.selectOption('#chs', '1'); await pg.waitForTimeout(300);
  /* 금고 열기 · 진도 조절 (반 전체 → 학생별). 찍은 뒤 처음 상태(모두 열림)로 되돌림 */
  await pg.evaluate(() => scrollTo(0, 0));
  const gshot = async name => { await pg.waitForTimeout(400); await pg.evaluate(() => document.querySelectorAll('.toast').forEach(e => e.remove())); const el = await pg.$('#gatec'); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  await pg.click('#gx'); await pg.selectOption('#gN', '12'); await pg.click('#gUp'); await pg.waitForTimeout(600); await pg.evaluate(POLISH);
  await marks(pg, [['.gmode', '1', 't'], ['#gUp', '2', 'r'], ['.gtiles .gt.on', '3', 't']]);
  await gshot('t14_gate_all'); await pg.evaluate(POLISH);
  await pg.click('[data-gs="stu"]'); await pg.click('[data-s="3"]'); await pg.click('[data-s="7"]'); await pg.selectOption('#gN', '16'); await pg.click('#gUpS'); await pg.waitForTimeout(600); await pg.evaluate(POLISH);
  await marks(pg, [['[data-s="7"]', '1', 'r'], ['#gUpS', '2', 'r'], ['#gRst', '3', 'r']]);
  await gshot('t15_gate_stu'); await pg.evaluate(POLISH);
  await pg.evaluate(async () => { const c = classes.find(x => x.code === curCode); await DB.updateClass(c.code, { gate: null }); c.gate = null; gCode = null; gExp = false; gScope = 'all'; drawGate(); });
  await pg.waitForTimeout(600);
  /* 선생님 관리 */
  await pg.evaluate(() => scrollTo(0, 0));
  const adm = await pg.$('text=선생님 관리'); if (adm) { await adm.click(); await pg.waitForTimeout(600); await pg.evaluate(POLISH); await shot(pg, 't12_admin', { x: 0, y: 0, width: 1280, height: 700 }); }

  /* 3) 학생 화면 */
  const sp = await ctx.newPage(); sp.on('pageerror', e => errs.push('S:' + e.message));
  await sp.goto(G + '#join'); await sp.waitForTimeout(500); await sp.evaluate(POLISH);
  await sp.fill('#code', CODE); await sp.waitForSelector('#num option[value="23"]', { state: 'attached' }); await sp.selectOption('#num', '23'); await sp.evaluate(POLISH);
  await marks(sp, [['#code', '1', 'r'], ['#num', '2', 'r'], ['#go', '3', 'r']]);
  await shot(sp, 's01_join');
  await sp.evaluate(POLISH);
  await sp.click('#go'); await sp.waitForSelector('#tmap');
  await sp.evaluate(() => { const d = {}; [1, 2, 3, 4, 5, 8, 9].forEach(n => d[n] = { stars: 1 + n % 3 }); localStorage.setItem('fg_dex', JSON.stringify(d)); });
  await sp.goto(G + '#dex'); await sp.goto(G + '#'); await sp.waitForTimeout(1500); await sp.evaluate(() => scrollTo(0, 0)); await sp.waitForTimeout(300);
  await shot(sp, 's02_map');
  /* 금고 문제 */
  await sp.goto(G + '#ch6'); await sp.waitForSelector('#start'); await sp.evaluate(POLISH); await shot(sp, 's03_vault_intro');
  await sp.click('#start'); await sp.waitForTimeout(500);
  await marks(sp, [['#keys', '1', 't'], ['#lockrow', '2', 't'], ['#qp .qtag', '3', 'r']]);
  await shot(sp, 's04_vault_q'); await sp.evaluate(POLISH);
  /* 틀렸을 때 */
  const v = await sp.evaluate(() => { const v = S.locks[S.cur].v; return { type: v.type, opts: v.opts && v.opts.map(o => o.ok) }; });
  if (v.type === 'choice') { await sp.click(`.opt[data-k="${v.opts.indexOf(false)}"]`); await sp.waitForTimeout(1200); await shot(sp, 's05_vault_wrong'); }
  /* 마지막 방: 자물쇠를 바로 열고 이동 */
  await sp.goto(G + '#'); await sp.goto(G + '#ch7'); await sp.waitForSelector('#start'); await sp.click('#start'); await sp.waitForTimeout(300);
  await sp.evaluate(() => { S.locks.forEach(l => { l.ok = true; l.firstOk = true; }); renderFinal(); });
  await sp.fill('#wr', '모르는 번호로 검찰이라며 돈을 옮기라는 전화가 오면 일단 끊고 112에 신고할게요.'); await sp.waitForTimeout(300);
  await marks(sp, [['.kws', '1', 't'], ['#mt', '2', 'r'], ['#fs', '3', 'r']]);
  await shot(sp, 's06_final'); await sp.evaluate(POLISH);
  await sp.click('#fs'); await sp.waitForTimeout(2200); await shot(sp, 's07_clear');
  /* 다른 기기 막힘 화면 */
  await sp.evaluate(() => viewBlocked({ n: 9 }, 'foreign')); await sp.evaluate(POLISH); await shot(sp, 's08_blocked', { x: 0, y: 0, width: 1280, height: 480 });
  /* 보스전 */
  await sp.goto(G + '#boss1'); await sp.waitForSelector('#start'); await sp.evaluate(POLISH); await shot(sp, 's09_boss_intro');
  await sp.click('#start'); await sp.waitForFunction(() => S.phase === 'boss', null, { timeout: 30000 }); await sp.waitForTimeout(400);
  await shot(sp, 's10_boss_battle');
  /* 도감 */
  await sp.goto(G + '#dex'); await sp.waitForTimeout(1200); await shot(sp, 's11_dex');
  console.log('errs', errs);
  await b.close(); srv.close();
})();
