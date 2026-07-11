AI Korean Master 한글 자모 게임

파일:
- index.html
- game.css
- game.js
- game-data.js
- game-i18n.js

설치:
1. 이 5개 파일을 현재 한글앱의 game 폴더에 넣습니다.
2. 브라우저에서 game/index.html을 직접 엽니다.
3. 메인으로 돌아가기 경로가 다르면 game.js의 goHome() 안 "../index.html"을 수정합니다.
4. 현재 앱 언어 저장 키가 자동 감지되지 않으면 game.js의 getCurrentLanguage()에 실제 키를 추가합니다.
5. 현재 앱 폰트 링크와 font-family를 index.html 및 game.css의 주석 위치에 적용합니다.
6. game-data.js의 임시 단어를 자모음 마스터 코스 실제 4개 조합 단어로 교체합니다.

메인 버튼 예시:
<a href="./game/index.html">Korean Word Game</a>

초기화 테스트:
브라우저 개발자 도구 콘솔에서 아래 실행:
localStorage.removeItem("aiKoreanMasterLetterGameDailyState");
location.reload();
