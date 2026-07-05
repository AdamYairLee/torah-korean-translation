# 오늘의 토라 공부 앱 v2

## 이번 버전에 반영된 것
- 오늘 / 이전 공부 / 용어 수정 / 설정 하단 메뉴
- 상단 이전 버튼
- 날짜별 이전 공부 보관 및 다시 열기
- 인명, 타낙흐 책 이름, 유대 문헌 용어 우선 표기 용어집
- `הקב״ה`, `הקדוש ברוך הוא` → “거룩하고 복되신 분” 규칙
- 하쉠 관련 표현은 극존칭으로 반영한다는 번역 규칙

## 숨은 경로를 아주 쉽게 설명하면
웹사이트 안에 방 하나를 하나 더 만드는 것입니다.

예를 들어 현재 사이트가 이 집이라면:

`https://jewishkorean.com`

그 안에 밖에서 보이지 않는 방 주소를 하나 만듭니다.

`https://jewishkorean.com/private/today-torah/`

사이트 첫 화면 메뉴에는 이 주소를 걸지 않습니다. 그래서 일반 방문자는 못 봅니다. 아담님은 주소를 직접 입력해서 들어갑니다.

단, 이것은 “문을 간판 뒤에 숨기는 것”에 가깝고 완전한 잠금장치는 아닙니다. 진짜 보안은 서버 로그인, Cloudflare Access, Firebase/Supabase Auth 같은 방식으로 해야 합니다.

## 업로드 위치 예시
호스팅 파일 관리자에서 다음처럼 넣습니다.

```text
public_html/
  index.html
  private/
    today-torah/
      index.html
      app.js
      styles.css
      manifest.json
      assets/
      data/
      docs/
```

그 뒤 접속 주소:

```text
https://jewishkorean.com/private/today-torah/
```

## 데이터 입력
`data/daily.json`에 날짜별 카드를 추가합니다.

## 용어집 수정
`data/glossary.json`의 `terms`와 `replacements`를 수정하면 됩니다.
