/* 금고 탈출 — 저장소 연결 (Firebase 또는 체험 모드)
   학생: 익명 로그인 → 반 코드 확인 → 자기 기록만 쓰기·읽기
   교사: 구글 로그인 → teachers/{이메일} 문서가 있어야 반을 만들고 자기 반 기록을 볼 수 있음
   데이터 구조
     teachers/{email}                 { name, school, admin? }
     classes/{code}                   { name, school, size, open, gate?, ownerUid, ownerEmail, ownerName, createdAt }   (gate: 열린 금고, chapters.js gateOpen)
     classes/{code}/records/{ch_번호}  { ch, num, uid, status, locks[], firstOk, wrong, stars, writing, ... } */
(function () {
  "use strict";
  const CFG = window.FIREBASE_CONFIG;
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const pad = n => String(n).padStart(2, "0");
  const recId = (ch, num) => `${ch}_${pad(num)}`;
  function newCode() {
    const a = new Uint32Array(6); crypto.getRandomValues(a);
    return Array.from(a, x => ALPH[x % ALPH.length]).join("");
  }
  /* 선생님 '통과 처리' 기록: 학생이 하던 기록(old)은 uid를 그대로 두고 통과로, 없으면 uid 'teacher'로 새로 만듦 */
  const passData = (ch, num, old) => ({ ch, num: pad(num), uid: old ? old.uid : "teacher", status: "cleared", byTeacher: true,
    stars: (old && old.stars) || 1, clearedAt: Date.now(), updatedAt: Date.now(), ...(old ? {} : { startedAt: Date.now(), locks: [], firstOk: 0, wrong: 0 }) });
  /* 순서대로 모드에서 앞 금고 통과 여부 */
  const seqOkRecs = (gate, ch, num, recOf) => window.gateSeqOk(gate, num, ch, n => { const r = recOf(n); return !!(r && r.status === "cleared"); });
  const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  /* ---------------- 체험 모드 (localStorage) ---------------- */
  function demoBackend() {
    const KEY = "fg_demo_v1";
    const load = () => LS.get(KEY, null);
    const save = s => { LS.set(KEY, s); listeners.forEach(f => f()); };
    const listeners = new Set();
    window.addEventListener("storage", e => { if (e.key === KEY) listeners.forEach(f => f()); });

    function seed() {
      let s = load();
      if (s) return s;
      s = { classes: {}, records: {}, teachers: { "demo@example.com": { name: "체험 선생님", school: "체험중학교", admin: true } }, uid: "demo-" + newCode(), teacher: null };
      s.classes.DEMO01 = { name: "체험용 반 (2학년 1반)", school: "체험중학교", size: 24, open: true, ownerUid: "demo-teacher", ownerEmail: "demo@example.com", ownerName: "체험 선생님", createdAt: Date.now() };
      // 다른 학생들의 예시 기록 (교사 화면 미리보기용)
      const recs = {}; const now = Date.now();
      const samples = "작은 소문만 돌아도 사람들이 한꺼번에 돈을 찾으러 가서 은행이 망하고 다른 은행까지 위험해진다.|예금보험공사가 없으면 은행이 문을 닫을 때 내 돈을 못 돌려받아서 모두 불안해할 것 같다.|뱅크런이 일어나 금고의 돈이 바닥나고 경제 전체가 흔들린다.|사람들이 은행을 믿지 못해 집에 돈을 숨겨 둘 것 같다. 뱅크런도 자주 일어날 것이다.|은행이 하나 망하면 소문이 퍼져서 다른 은행도 뱅크런이 일어난다.".split("|");
      for (let num = 1; num <= 17; num++) {
        if (num === 6 || num === 11) continue;
        const cleared = num <= 14;
        const locks = [0, 1, 2, 3, 4].map(i => { const t = [0, 3, 4].includes(i) && (num * 5 + i * 7) % (i === 3 ? 3 : 4) === 0 ? 2 + (num % 2) : 1; return { tries: cleared || i < 3 ? t : 0, ok: cleared || i < 3, firstOk: t === 1 }; });
        const firstOk = locks.filter(l => l.ok && l.firstOk).length;
        recs[recId(18, num)] = { ch: 18, num: pad(num), uid: "demo-other-" + num, status: cleared ? "cleared" : "playing",
          locks, firstOk, wrong: locks.reduce((a, l) => a + Math.max(0, l.tries - 1), 0),
          stars: firstOk >= 5 ? 3 : firstOk >= 3 ? 2 : 1, writing: cleared ? samples[num % samples.length] : "",
          restarts: num === 9 ? 1 : 0, startedAt: now - 900000, updatedAt: now - 300000 + num * 9000, clearedAt: cleared ? now - 300000 + num * 9000 : null,
          sec: cleared ? 360 + num * 23 : null };
        if (num % 3 === 0) recs[recId(17, num)] = { ch: 17, num: pad(num), uid: "demo-other-" + num, status: "cleared", locks: [], firstOk: 4, wrong: 1, stars: 2, writing: "", startedAt: now - 86400000, updatedAt: now - 86400000, clearedAt: now - 86400000, sec: 400 };
      }
      s.records.DEMO01 = recs;
      LS.set(KEY, s);
      return s;
    }
    const st = () => seed();

    return {
      mode: "demo",
      async init() { seed(); },
      uid() { const s = st(); return s.teacher ? s.teacher.uid : s.uid; },
      async ensureStudent() { return st().uid; },
      async getClass(code) { const c = st().classes[normCode(code)]; return c ? { code: normCode(code), ...c } : null; },
      async getRecord(code, ch, num) {
        const s = st(); const r = (s.records[code] || {})[recId(ch, num)];
        if (!r) return null;
        if (r.uid !== s.uid && !r.byTeacher && !(s.teacher && s.classes[code].ownerUid === s.teacher.uid)) return { _foreign: true };
        return r;
      },
      async saveRecord(code, ch, num, data) {
        const s = st(); const c = s.classes[code];
        if (!c || c.open === false) throw new Error("closed");
        s.records[code] = s.records[code] || {};
        const id = recId(ch, num), old = s.records[code][id];
        if (old && old.uid !== s.uid) throw new Error("foreign");
        if (old && old.status === "cleared") throw new Error("foreign");
        /* 보안 규칙과 같게: 새로 시작할 때만 열린 금고·순서 확인 */
        if (!old && (!gateOpen(c.gate, num, ch) || !seqOkRecs(c.gate, ch, num, n => s.records[code][recId(n, num)]))) throw new Error("gated");
        s.records[code][id] = { ...(old || {}), ...data, ch, num: pad(num), uid: s.uid, updatedAt: Date.now() };
        save(s);
      },
      async myRecords(code, num) { const s = st(); return Object.values(s.records[code] || {}).filter(r => r.uid === s.uid || (r.byTeacher && num != null && r.num === pad(num))); },

      onAuth(cb) { const f = () => cb(st().teacher); listeners.add(f); f(); return () => listeners.delete(f); },
      async signIn() { const s = st(); s.teacher = { uid: "demo-teacher", email: "demo@example.com", name: "체험 선생님" }; save(s); },
      async signOut() { const s = st(); s.teacher = null; save(s); },
      async teacherInfo() { const s = st(); return s.teacher ? s.teachers[s.teacher.email] || null : null; },
      async listClasses() { const s = st(); return Object.entries(s.classes).filter(([, c]) => s.teacher && c.ownerUid === s.teacher.uid).map(([code, c]) => ({ code, ...c })); },
      async createClass({ name, school, size }) {
        const s = st(); let code; do { code = newCode(); } while (s.classes[code]);
        s.classes[code] = { name, school, size, open: true, ownerUid: s.teacher.uid, ownerEmail: s.teacher.email, ownerName: s.teacher.name, createdAt: Date.now() };
        save(s); return code;
      },
      async updateClass(code, patch) { const s = st(); Object.assign(s.classes[code], patch); save(s); },
      async deleteClass(code) { const s = st(); delete s.classes[code]; delete s.records[code]; save(s); },
      watchClass(code, cb) { const f = () => { const c = st().classes[code]; cb(c ? { code, ...c } : null); }; listeners.add(f); f(); return () => listeners.delete(f); },
      watchRecords(code, cb) {
        const f = () => cb(Object.entries(st().records[code] || {}).map(([id, r]) => ({ id, ...r })));
        listeners.add(f); f(); const t = setInterval(f, 4000);
        return () => { listeners.delete(f); clearInterval(t); };
      },
      async deleteRecord(code, id) { const s = st(); delete (s.records[code] || {})[id]; save(s); },
      async deleteRecords(code, ids) { const s = st(); ids.forEach(id => delete (s.records[code] || {})[id]); save(s); },
      async teacherPass(code, ch, nums) {
        const s = st(); s.records[code] = s.records[code] || {};
        nums.forEach(num => { const id = recId(ch, num), old = s.records[code][id]; if (old && old.status === "cleared") return; s.records[code][id] = { ...(old || {}), ...passData(ch, num, old) }; });
        save(s);
      },
      async listTeachers() { return Object.entries(st().teachers).map(([email, t]) => ({ email, ...t })); },
      async addTeacher(email, info) { const s = st(); s.teachers[email.toLowerCase()] = info; save(s); },
      async removeTeacher(email) { const s = st(); delete s.teachers[email]; save(s); },
      resetDemo() { localStorage.removeItem(KEY); listeners.forEach(f => f()); }
    };
  }

  /* ---------------- Firebase ---------------- */
  function firebaseBackend() {
    let A, F, app, auth, db, ready;
    const init = () => ready || (ready = (async () => {
      const [a, au, fs] = await Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")]);
      A = au; F = fs;
      app = a.initializeApp(CFG); auth = A.getAuth(app); db = F.getFirestore(app);
      await new Promise(r => { const u = A.onAuthStateChanged(auth, () => { u(); r(); }); });
    })());
    const cls = code => F.doc(db, "classes", code);
    const rec = (code, id) => F.doc(db, "classes", code, "records", id);
    const denied = e => e && (e.code === "permission-denied" || /permission/i.test(e.message || ""));

    return {
      mode: "firebase",
      init,
      uid() { return auth && auth.currentUser ? auth.currentUser.uid : null; },
      async ensureStudent() {
        await init();
        if (!auth.currentUser) await A.signInAnonymously(auth);
        return auth.currentUser.uid;
      },
      async getClass(code) {
        await this.ensureStudent();
        const s = await F.getDoc(cls(normCode(code)));
        return s.exists() ? { code: s.id, ...s.data() } : null;
      },
      async getRecord(code, ch, num) {
        await this.ensureStudent();
        try { const s = await F.getDoc(rec(code, recId(ch, num))); return s.exists() ? s.data() : null; }
        catch (e) { if (denied(e)) return { _foreign: true }; throw e; }
      },
      async saveRecord(code, ch, num, data) {
        const uid = await this.ensureStudent();
        try { await F.setDoc(rec(code, recId(ch, num)), { ...data, ch, num: pad(num), uid, updatedAt: Date.now() }, { merge: true }); }
        catch (e) {
          if (!denied(e)) throw e;
          let c = null, r = null; try { c = await this.getClass(code); r = await this.getRecord(code, ch, num); } catch (e2) {}
          /* 기록 닫힘 / 아직 안 연 금고(또는 순서대로 모드에서 앞 금고 미통과) / 다른 기기 기록 */
          throw new Error(c && c.open === false ? "closed" : c && !r ? "gated" : "foreign");
        }
      },
      async myRecords(code, num) {
        const uid = await this.ensureStudent(), col = F.collection(db, "classes", code, "records");
        const out = (await F.getDocs(F.query(col, F.where("uid", "==", uid)))).docs.map(d => d.data());
        /* 선생님이 통과 처리한 기록 (내 번호) */
        if (num != null) try { (await F.getDocs(F.query(col, F.where("num", "==", pad(num)), F.where("byTeacher", "==", true)))).docs.forEach(d => { const x = d.data(); if (!out.some(o => o.ch === x.ch)) out.push(x); }); } catch (e) { console.warn(e); }
        return out;
      },

      onAuth(cb) {
        let un = () => {};
        init().then(() => { un = A.onAuthStateChanged(auth, u => cb(u && !u.isAnonymous ? { uid: u.uid, email: (u.email || "").toLowerCase(), name: u.displayName || "" } : null)); });
        return () => un();
      },
      async signIn() { await init(); await A.signInWithPopup(auth, new A.GoogleAuthProvider()); },
      async signOut() { await init(); await A.signOut(auth); },
      async teacherInfo() {
        await init(); const u = auth.currentUser; if (!u || !u.email) return null;
        try { const s = await F.getDoc(F.doc(db, "teachers", u.email.toLowerCase())); return s.exists() ? s.data() : null; }
        catch (e) { return null; }
      },
      async listClasses() {
        await init();
        const q = F.query(F.collection(db, "classes"), F.where("ownerUid", "==", auth.currentUser.uid));
        return (await F.getDocs(q)).docs.map(d => ({ code: d.id, ...d.data() }));
      },
      async createClass({ name, school, size }) {
        await init(); const u = auth.currentUser;
        for (let i = 0; i < 5; i++) {
          const code = newCode();
          if ((await F.getDoc(cls(code))).exists()) continue;
          await F.setDoc(cls(code), { name, school, size, open: true, ownerUid: u.uid, ownerEmail: u.email.toLowerCase(), ownerName: u.displayName || "", createdAt: Date.now() });
          return code;
        }
        throw new Error("반 코드를 만들지 못했어요. 다시 시도해 주세요.");
      },
      async updateClass(code, patch) { await init(); await F.updateDoc(cls(code), patch); },
      async deleteClass(code) {
        await init();
        const docs = (await F.getDocs(F.collection(db, "classes", code, "records"))).docs;
        for (let i = 0; i < docs.length; i += 400) {
          const b = F.writeBatch(db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit();
        }
        await F.deleteDoc(cls(code));
      },
      watchRecords(code, cb) {
        let un = () => {}, stop = false;
        init().then(() => { if (!stop) un = F.onSnapshot(F.collection(db, "classes", code, "records"), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn(e)); });
        return () => { stop = true; un(); };
      },
      /* 반 문서 지켜보기 — 학생 지도가 선생님이 연 금고를 바로 보여 줌 (학생도 반 문서 하나는 읽을 수 있음) */
      watchClass(code, cb) {
        let un = () => {}, stop = false;
        this.ensureStudent().then(() => { if (!stop) un = F.onSnapshot(cls(code), s => cb(s.exists() ? { code: s.id, ...s.data() } : null), e => console.warn(e)); }).catch(e => console.warn(e));
        return () => { stop = true; un(); };
      },
      async deleteRecord(code, id) { await init(); await F.deleteDoc(rec(code, id)); },
      async deleteRecords(code, ids) {
        await init();
        for (let i = 0; i < ids.length; i += 400) { const b = F.writeBatch(db); ids.slice(i, i + 400).forEach(id => b.delete(rec(code, id))); await b.commit(); }
      },
      async teacherPass(code, ch, nums) {
        await init();
        const b = F.writeBatch(db);
        for (const num of nums) {
          const ref = rec(code, recId(ch, num)), snap = await F.getDoc(ref), old = snap.exists() ? snap.data() : null;
          if (old && old.status === "cleared") continue;
          b.set(ref, passData(ch, num, old), { merge: true });
        }
        await b.commit();
      },
      async listTeachers() { await init(); return (await F.getDocs(F.collection(db, "teachers"))).docs.map(d => ({ email: d.id, ...d.data() })); },
      async addTeacher(email, info) { await init(); await F.setDoc(F.doc(db, "teachers", email.toLowerCase()), info); },
      async removeTeacher(email) { await init(); await F.deleteDoc(F.doc(db, "teachers", email)); }
    };
  }

  window.DB = CFG ? firebaseBackend() : demoBackend();
  window.DB.normCode = normCode;
  window.DB.recId = recId;
  window.DB.pad = pad;
  window.DB.LS = LS;
})();
