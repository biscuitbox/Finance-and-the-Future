# 교사용 사용 설명서 그림 (game/guide.html)

- `s12_story_play`·`s13_story_end`·`t13_story`(스토리 게임 3장)는 기본 체험 반(DEMO01)으로 따로 찍었다. 나머지 `*.webp` 23장은 `game/guide.html`이 쓰는 그림이다. 체험 모드 데이터를 '2학년 1반 · K7M3QP · 김금융 선생님'처럼 실제 학급처럼 바꿔서 찍었다(실제 학생 정보 없음).
- 화면(교사 화면·학생 화면)이 바뀌면 다시 찍는다.
  1. 저장소 루트에서 `node game/guide/make_shots.js` (Playwright·Chromium 필요. 스크립트가 firebase-config.js를 체험 모드로 바꿔 띄움) → `game/guide/raw/*.png`
  2. webp로 바꾸기(가로 1100px, 품질 80):
     ```
     python3 -c "from PIL import Image;import glob,os
     for f in glob.glob('game/guide/raw/*.png'):
         im=Image.open(f).convert('RGB'); im=im.resize((1100,int(im.size[1]*1100/im.size[0]))) if im.size[0]>1100 else im
         im.save('game/guide/'+os.path.basename(f)[:-4]+'.webp','WEBP',quality=80,method=6)"
     ```
  3. `game/guide/raw/`는 커밋하지 않는다.
- 그림 속 주황 동그라미 번호(①②③)는 `guide.html`의 설명 번호와 맞춰 두었다. 번호 위치는 `make_shots.js`의 `marks()` 호출에서 바꾼다.
