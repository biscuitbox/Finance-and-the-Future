/* =====================================================================
   Firebase 설정 — game.html(학생)과 teacher.html(교사)이 함께 읽음
   ---------------------------------------------------------------------
   · 아직 비어 있으면(null) '체험 모드'로 작동한다.
     기록은 그 기기 브라우저에만 남고, 교사 화면도 같은 브라우저 기록만 보여 준다.
   · Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → 'SDK 설정 및 구성'의
     firebaseConfig 값을 아래 config 자리에 그대로 붙여 넣는다.
     (이 값은 공개되어도 괜찮은 값이다. 보안은 Firestore 보안 규칙이 지킨다.)
   ===================================================================== */
window.FM_FIREBASE = {
  config: null,
  /* 예)
  config: {
    apiKey: "AIza...",
    authDomain: "my-project.firebaseapp.com",
    projectId: "my-project",
    storageBucket: "my-project.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
  },
  */
  collection: "fm_runs",   // 기록을 모으는 컬렉션 이름
  grade: 2                 // 학년 (화면 표시용)
};
