/* 금고 탈출 — Firebase 설정
   Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → 'SDK 설정 및 구성'의 firebaseConfig 값을 아래에 붙여 넣으세요.
   비워 두면(null) '체험 모드'로 작동합니다. 체험 모드는 기록이 이 브라우저에만 저장됩니다.
   ※ 이 값은 공개되어도 괜찮은 값입니다. 보안은 firestore.rules(보안 규칙)가 지킵니다.
   자세한 방법: SETUP.md */
window.FIREBASE_CONFIG = null;
/* 예시
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "my-finance-game.firebaseapp.com",
  projectId: "my-finance-game",
  storageBucket: "my-finance-game.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
