# 5787년 토라 강의 · 배포 및 운영

이 작업은 기존 Jewish Korean 사이트에 새 강의 페이지를 추가합니다. 기존 토라 번역·게임·한글 앱 코드는 유지합니다.

## 현재 배포 상태
- `torah-5787.html` — 베레쉬트와 노악흐 첫 문단 공개 미리보기, 7₪/20₪ 가격 표기.
- `torah-5787.css` — 한국어 Nanum Myeongjo 및 Gowun Dodum, 히브리어 Noto Serif Hebrew. 하이픈 소제목은 절제된 강조, 괄호 내용은 살짝 작고 회색. 본문 기본 16px 수준.
- `torah-5787.js` — 회원 인증 UI, 구매한 강의 재열람, 웹 복사·드래그·우클릭 제한.
- `torah-5787-config.js` — 공개 브라우저 설정. 결제 활성화는 **기본값 false**.
- 공개 저장소에는 유료 전문을 넣지 않았습니다. 원고에 있는 마지막 **요약**은 본문에 포함하지 않습니다.

**중요:** 이 저장소의 페이지가 보이더라도 실제 회원 결제·구매 후 해제는 아직 가동되지 않습니다. 연결·테스트를 마치기 전까지 결제 버튼은 사용 불가입니다. 코드를 편집해 버튼만 켜는 것은 금지합니다.

## 처음 한 번 필요한 서비스 설정

1. [Supabase](https://supabase.com/)에서 프로젝트를 생성합니다. Authentication > URL Configuration에서 `https://jewishkorean.com/torah-5787.html`을 로그인 리다이렉트 허용 주소로 추가합니다. 이메일 OTP/매직 링크를 활성화합니다.
2. Supabase SQL Editor에서 `supabase/torah-5787-schema.sql`을 실행합니다. 관리자 본인 이메일로 Supabase에 한 번 가입하고 확인한 다음 `torah_5787_admins` 테이블에 자신의 사용자 UUID를 추가합니다. 브라우저 코드에 관리자 계정 정보를 저장하면 안 됩니다.
3. Supabase Edge Function `torah-access`를 `supabase/functions/torah-access/index.ts` 코드로 배포합니다. Ko-fi가 로그인 헤더 없이 결제 이벤트를 보내므로 함수의 플랫폼 JWT 검사는 끄고(`--no-verify-jwt`), 함수 내부의 **Ko-fi 토큰 검사**와 **사용자 JWT 검사**를 이용합니다.
4. Supabase 함수 비밀 환경변수를 설정합니다. `KO_FI_VERIFICATION_TOKEN` (Ko-fi의 Webhooks에서 확인), `KO_FI_MEMBERSHIP_TIER` (정확한 멤버십 등급 이름), `KO_FI_CURRENCY` (Ko-fi에서 설정한 실제 결제 통화, 예: USD), `KO_FI_MONTHLY_MIN_AMOUNT` (해당 통화의 실제 1개월 구독료), `TORAH_ORIGIN=https://jewishkorean.com`. Supabase가 제공하는 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`도 배포 함수에서 사용합니다.
5. [Ko-fi Webhooks](https://ko-fi.com/manage/webhooks)의 URL을 `https://YOUR_PROJECT_REF.supabase.co/functions/v1/torah-access`로 설정합니다. Ko-fi의 테스트 이벤트로 수신을 확인합니다.
6. Ko-fi에서 5787년 멤버십 등급과 베레쉬트/노악흐의 개별 상품을 실제로 생성합니다. 각 상품의 고유 direct link code를 `torah_5787_shop_products` 테이블에서 `5787-bereshit` 및 `5787-noach` ID에 연결합니다. **기존 코드의 다른 상품 링크 `https://ko-fi.com/s/d707c7f45c`를 강의 상품으로 재사용하지 않습니다.**
7. `torah-5787-config.js`에 Supabase Project URL, **publishable/anon 공개 키**(service-role이 아님), 멤버십 상품 링크, 개별 상품 링크를 입력합니다. 실제 테스트 결제에서 (a) 본인 구매 권한, (b) 다른 회원의 접근 금지, (c) 첫 구독 회차의 강의, (d) 구독 종료 후 기취득 강의 재열람을 확인한 후에만 `paymentReady: true`로 변경합니다.

### Ko-fi 가격 통화에 대한 제한

Ko-fi 공식 지원 결제 통화 목록에는 현재 **ILS(₪)**가 없습니다. 사이트 화면의 **개별 7₪, 월간 20₪**는 설정하려는 가격 목표입니다. Ko-fi에는 지원하는 통화(USD 등)로 실제 판매 가격을 정해야 합니다. 고정 환율이 아니므로 정확히 7₪/20₪를 청구한다고 표시하면 안 됩니다. 실제 결제 금액과 통화가 Ko-fi 결제 페이지에서 다르게 표시될 수 있음을 방문자에게 알립니다. 4편 7₪씩 구매하는 것과 20₪를 비교하면 약 28.6% 할인입니다.

### 유료 열람 모델

- 개별 결제: 해당 파라샤의 접근 권한을 기간 제한 없이 부여합니다.
- 월간 구독: **매 결제 시점으로부터 1개월 동안 발행된 강의**의 접근 권한을 영구적으로 부여합니다. 결제 종료 이후 새 글은 열리지 않습니다. Ko-fi의 웹훅에는 구독 종료 알림이 없으므로, 결제 알림으로 확인된 개별 기간만 사용합니다.
- 관리자: Supabase Auth 가입 후 `torah_5787_admins`에 지정된 본인에게 게시된 모든 강의를 열어 줍니다.
- 로그인 계정의 이메일이 Ko-fi 결제 이메일과 같고 이메일 확인을 완료한 경우에만 구매 기록을 자동 인식합니다. 서로 다른 이메일로 결제했다면 안전한 수동 계정 연결 절차가 따로 필요합니다.
- 복사 제한은 일반 브라우저의 마우스 드래그·우클릭 등을 막는 보조 조치입니다. 스크린샷·개발자 도구·촬영까지 완전 차단하는 기술은 아닙니다.

### Word 원고 게시 워크플로

**유료 Word 파일을 공개 저장소의 어떤 브랜치에도 업로드하지 마세요.** 브랜치만 비공개로 하는 기능은 없습니다.

원고 파일을 비공개로 받아 처리하거나 비공개 저장소/안전한 관리 화면에서만 취급합니다. 예시 도구:

```sh
pip install python-docx
python scripts/publish_torah_docx.py "1. 파라샤트 베레쉬트.docx" --id 5787-bereshit
python scripts/publish_torah_docx.py "1. 파라샤트 베레쉬트.docx" --id 5787-bereshit --publish
```

첫 명령은 첫 문단 공개 미리보기만 출력합니다. 두 번째 명령은 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 운영 환경변수로 전달한 상태에서만 유료 원고 전문을 **Supabase 비공개 데이터베이스에** 전송합니다. 원본 DOCX는 수정하지 않습니다. `- 요약: ...` 이하의 모든 내용은 자동 제외됩니다. 각 `- ` 제목은 `heading`, 나머지는 `paragraph`가 됩니다. 화면 서식은 CSS가 자동으로 적용합니다. 새 글의 공개 미리보기와 목록 항목은 `torah-5787.js`에 추가합니다.

**매주 DOCX 하나만 보내서 자동 배포하려면** 비공개 업로드 경로/별도 비공개 저장소와 게시 트리거를 추가 구성해야 합니다. 이 공개 저장소에 Word 파일을 올리는 GitHub Actions 자동화는 유료 본문 유출 위험 때문에 설치하지 않았습니다.

## 자료 보존

`1. 파라샤트 베레쉬트.docx`, `2. 파라샤트 노악흐(2).docx`의 원본 파일에는 요약이 남아 있습니다. 요약은 향후 책 제작용으로 별도 보관하세요. 현재 GitHub에는 두 원고의 **첫 문단만** 공개했습니다.
