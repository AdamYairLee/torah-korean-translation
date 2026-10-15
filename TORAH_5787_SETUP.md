# 5787년 토라 강의 · 월간 구독 전용 운영 안내
## 2026-10-16 진행 상황

- **베레쉬트와 노악흐 전문을 Supabase의 비공개 DB에 저장함.** 각 DOCX의 마지막 `- 요약:` 이하를 제외하고 각각 18개 및 30개 단락/제목 블록을 저장함.
- 두 원고는 `published_at=NULL`인 **비공개 초안**이며, 현재는 일반 회원에게 접근 권한이 없음. 관리자 인증 후에는 비공개 초안 읽기 허용.
- 관리자로 승인할 이메일 1개를 **비공개 Supabase DB에서만** 허용 목록으로 등록함. 해당 주소의 계정이 이메일 인증을 마치면 `torah_5787_admins`에 자동 등록하는 트리거가 설치됨.
- `torah-5787.html`의 소개글에서 **'오늘의 질문'을 삭제**하고 새 문장으로 변경함.
- `torah-5787.css`의 본문을 확대함: 모바일(390px 화면) 미리보기 약 18px, 본문 약 18.6px, 폭 360px 기기에서는 본문 18px. 데스크톱 본문 최대 약 19.8px, 보다 여유로운 행간 및 단락 간격. 한글/히브리어 예쁜 서체와 괄호 안 회색 작은 글씨 유지.
- **구독 버튼 미활성화 사유:** Ko-fi 등급은 DRAFT이며, `torah-5787-config.js`의 `membershipUrl`이 비어 있고 `paymentReady=false`임. 실제 결제 후 로그인/권한 검증 완료 전 결제 노출 금지.
- **완료를 위해 사용자 직접 설정이 필요한 항목:** Supabase Auth URL Configuration에서 Site URL을 `https://jewishkorean.com`으로 설정하고 `https://jewishkorean.com/torah-5787.html`을 Redirect URLs에 등록. 이후 웹사이트에서 관리자로 등록한 이메일로 이메일 로그인 링크를 요청하고 확인해야 함.
- 아직 **로그인 인증 성공/자동 관리자 부여/유료 결제 후 권한 자동 해제 테스트는 수행되지 않음.** 구독 공개는 해당 검증 뒤 진행.


이 시스템은 **월간 구독 전용**입니다. 매주 새로운 파라샤를 게시하더라도 Ko-fi Shop에 개별 강의 상품을 만들 필요가 없습니다. 기존 사이트와 별도의 Ko-fi Shop 상품·기존 정기 후원은 변경하지 않았습니다.

## 현재 반영 상태 (2026-10-15)

- 사이트 메뉴 `5787년 토라 강의` → `https://jewishkorean.com/torah-5787.html`
- 월간 **USD $6.50** (약 20₪, 실제 카드 청구액은 환율·수수료에 따라 변동). 자동 결제
- 각 파라샤의 **첫 문단만 무료 미리보기**. 브라우저에서 드래그, 우클릭, 복사 등의 일반적인 조작 방지. 워터마크 없음
- **구독 결제 기간에 발행된 강의는 구독을 취소해도 영구 열람** 가능. 다음 결제 기간에 새로 발행된 글은 새 결제가 있어야 권한이 부여됨
- 관리자 본인은 Supabase에서 관리자 계정으로 지정한 후 모든 공개 강의 상시 열람
- 베레쉬트·노악흐 원고의 마지막 **「요약」은 책 출판용으로 제외**. 원본 DOCX에 요약 보존
- Supabase Project: `rdvxkzohxxgyufizxxrk`, [프로젝트 대시보드](https://supabase.com/dashboard/project/rdvxkzohxxgyufizxxrk)
- Edge Function `torah-access`: Ko-fi Webhook 수신 및 회원 JWT 검사. 유료 본문은 공개 GitHub에 올리지 않음
- Ko-fi Webhook의 일반 후원/멤버십/Shop 테스트는 **서버 도달(HTTP 200)**까지 확인. 실상품 구독 권한 부여는 아직 미검증
- **결제 버튼은 비활성화 상태** (`paymentReady: false`). Ko-fi의 5787년 멤버십은 아직 **DRAFT**, 웹사이트의 유료 전문도 미게시
- 공개 파일 `torah-5787-config.js`에는 Supabase URL, 공개 publishable key만 기재. **비밀 키를 GitHub에 절대 올리지 않음**

## 남은 필수 설정 (상품 공개 전)

1. [Supabase Authentication](https://supabase.com/dashboard/project/rdvxkzohxxgyufizxxrk/auth/url-configuration)에서 `https://jewishkorean.com/torah-5787.html` 이메일 로그인 리다이렉트 URL 허용. 회원의 이메일 인증 동작 검사
2. 관리자 본인의 Supabase 로그인 계정 생성 및 이메일 확인 후 `torah_5787_admins` 테이블에 해당 사용자 UUID 등록 (SQL 주석 참조). 관리자 이메일, 서비스 키를 공개 코드에 넣지 않음
3. 비공개 Supabase `torah_5787_articles` 테이블에 베레쉬트·노악흐 **마지막 요약을 제외한 전문** 업로드 및 게시일 지정
4. Ko-fi [Memberships](https://ko-fi.com/memberships/settings)에서 `5787년 토라 강의`의 월간 가격·혜택·영구 열람 안내 최종 확인. 기존 정기 후원자는 변경하지 않음
5. Ko-fi 회원 가입 실제 결제 및 갱신 관련 웹훅에서 등급 이름·가격·가입 이메일이 서버의 예상 값과 정확히 일치하는지 검증. 결제한 사용자/결제하지 않은 사용자/구독 종료 후 기존 글 접근 검증
6. Ko-fi의 **해당 멤버십 가입 링크**를 `torah-5787-config.js`의 `membershipUrl`에 입력하고, 위 결제 테스트가 통과한 뒤에만 `paymentReady: true`로 설정. DRAFT 멤버십 공개도 마지막에 진행

### Supabase 서버 비밀값

[Edge Function Secrets](https://supabase.com/dashboard/project/rdvxkzohxxgyufizxxrk/functions/secrets)에 다음 5개 값이 등록되어 있음:
`KO_FI_VERIFICATION_TOKEN`, `KO_FI_CURRENCY=USD`, `KO_FI_MEMBERSHIP_TIER=5787년 토라 강의`, `KO_FI_MONTHLY_MIN_AMOUNT=6.5`, `TORAH_ORIGIN=https://jewishkorean.com`.

Ko-fi Webhook 수신 URL:
`https://rdvxkzohxxgyufizxxrk.supabase.co/functions/v1/torah-access`

**주의:** Webhook은 해당 Ko-fi 계정의 다른 후원/Shop 알림도 받을 수 있습니다. 서버는 정확한 토라 강의 멤버십 결제만 열람 권한으로 인정합니다. 다른 상품 구매는 토라 열람 권한으로 처리하지 않습니다.

### Word 파일을 매주 게시하는 방식

유료 Word 원고를 **공개 GitHub 저장소에 업로드하면 안 됩니다**. 브랜치에 올려도 GitHub 기록에 남아 공개됩니다.

`scripts/publish_torah_docx.py`는 DOCX의 `- `로 표시된 제목을 강조할 수 있도록 구조화하고, **마지막 `- 요약: ...` 부분부터 끝까지 제외**하며, 첫 본문 문단만 무료 미리보기로 출력합니다. 원본 Word는 변경하지 않습니다.

예시:
```sh
pip install python-docx
python scripts/publish_torah_docx.py "1. 파라샤트 베레쉬트.docx" --id 5787-bereshit
python scripts/publish_torah_docx.py "1. 파라샤트 베레쉬트.docx" --id 5787-bereshit --publish
```

`--publish`는 관리자 환경의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정된 경우에만 유료 본문을 비공개 데이터베이스에 전송합니다. 화면 스타일은 `torah-5787.css`에서 적용하며 한글·히브리어 본문 서체, 소제목의 절제된 강조, 괄호 안 작은 회색 글씨를 공통으로 유지합니다.

**매주 Word 하나만 보내고 완전 자동 게시**하려면 별도 비공개 업로드 경로 또는 비공개 저장소 자동화가 추가로 필요합니다. 현재 공개 저장소에 Word를 업로드하는 자동화는 구성하지 않았습니다.

## 2026-10-15 정책 변경

이 강의 연재는 **월간 구독 하나**만 사용합니다. 과거 임시 개별 판매 화면·처리 코드는 정리되었고, 사용하지 않던 전용 데이터베이스 구조도 비워진 것을 확인한 뒤 철거했습니다. 기존 Ko-fi Shop의 다른 상품에는 영향이 없습니다.
