# 웰컴데이 AI 활용 챌린지 — 웹앱

신입사원 AI 활용 미니 챌린지 자동 채점 웹앱입니다.

## 보안 고려사항

| 항목 | 처리 방식 |
|------|-----------|
| `answer_key.json` | 서버 API(`/api/grade`)에서만 읽음. public 폴더 외부에 위치하여 클라이언트에서 직접 접근 불가 |
| `instructor/` 폴더 | webapp 외부에 위치. 절대 public에 복사하지 않음 |
| Firebase Private Key | 환경변수(`FIREBASE_PRIVATE_KEY`)로만 관리. 코드에 미포함 |
| 관리자 페이지 | Firebase Auth 로그인 없이 `/admin` 접근 시 `/admin/login`으로 자동 이동 |
| 학습자 문제 화면 | 유효한 입장코드 없이는 문항/다운로드 버튼 미노출 |
| **ZIP 직접 접근** | ⚠️ `/downloads/welcome_day_workspace.zip`은 `public/`에 위치하므로 URL을 아는 누구나 직접 다운로드 가능합니다. 이는 의도된 설계입니다(학습자용 파일이므로 보안 불필요). 만약 제한이 필요하다면 Next.js API Route를 통한 프록시 다운로드로 변경하세요. |

---

## 폴더 구조

```
ai-handover-challenge/
├── web_data/
│   ├── questions.json      # 문항 데이터 (공개)
│   └── answer_key.json     # 정답 데이터 (서버 전용, 절대 공개 금지)
├── dist/
│   └── welcome_day_workspace.zip
├── instructor/             # 강사용 해설 (절대 공개 금지)
└── webapp/                 # Next.js 앱 (이 폴더)
    └── public/
        └── downloads/
            └── welcome_day_workspace.zip   # dist/에서 복사한 파일
```

## 로컬 실행 방법 (Python 불필요)

### 사전 요건
- Node.js 18 이상 (https://nodejs.org)
- npm (Node.js에 포함)

### 실행

```powershell
# 1. webapp 폴더로 이동
cd ai-handover-challenge\webapp

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 프로덕션 빌드

```powershell
npm run build
npm run start
```

## 채점 API

`POST /api/grade`

서버 측에서 `web_data/answer_key.json`을 읽어 채점합니다.
결과는 서버 콘솔에 JSON 형태로 출력됩니다.

## 보안 주의사항

> **정답 데이터 노출 방지**

1. `web_data/answer_key.json`은 **절대 `public/` 폴더에 복사하지 마세요.**
   - 이 파일은 서버 측 API Route(`/api/grade`)에서만 읽습니다.
   - Next.js App Router의 서버 컴포넌트/API Route는 클라이언트에 소스가 노출되지 않습니다.

2. `instructor/` 폴더(강사용 정답 및 해설)는 **절대 `public/`에 복사하지 마세요.**

3. 프로덕션 배포 시 다음을 확인하세요:
   - `answer_key.json`이 환경 변수나 응답에 포함되지 않는지 확인
   - 브라우저 DevTools > Network 탭에서 `/api/grade` 응답에 정답이 포함되지 않는지 검증
   - Vercel 등 클라우드 배포 시 `web_data/` 폴더는 서버 파일시스템에만 존재하도록 구성

4. 배포 환경에서는 `instructor/` 폴더를 서버에 올리지 않거나, `.gitignore`에 추가하는 것을 권장합니다.

## 채점 방식

| 문항 | 유형 | 채점 방식 |
|------|------|-----------|
| Q1 | 단일 선택 | 완전 일치 |
| Q2 | 숫자 입력 | 공백 제거 후 정수 비교 |
| Q3 | 복수 선택 | 부분점수 (정답 +1점, 오답 -1점, 최소 0점) |
| Q4 | 매칭 | 쌍별 부분점수 (맞는 쌍당 1점) |
| Q5 | 파일 선택 | 부분점수 (정답 +1점, 오답 -1점, 최소 0점) |

## 로컬 테스트용 Firestore 입장코드 생성

Firebase 설정 완료 후, Firestore에 테스트용 입장코드 문서를 추가해야 /api/enter가 동작합니다.

### 방법 A: Firebase 콘솔에서 직접 추가

1. Firebase 콘솔 > Firestore Database > **컬렉션 시작**
2. 컬렉션 ID: `accessCodes`
3. 문서 ID: `1234` (테스트 입장코드)
4. 필드 추가:

| 필드 | 유형 | 값 |
|------|------|----|
| `code` | string | `1234` |
| `title` | string | `테스트 코드` |
| `active` | boolean | `true` |
| `createdAt` | timestamp | (현재 시각) |
| `expiresAt` | null | - |
| `createdBy` | null | - |

### 방법 B: Node.js 스크립트로 추가

```javascript
// scripts/seed_access_code.js (webapp 폴더에서 실행)
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // 서비스 계정 JSON

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

admin.firestore().collection("accessCodes").doc("1234").set({
  code: "1234",
  title: "테스트 코드",
  active: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  expiresAt: null,
  createdBy: null,
}).then(() => { console.log("완료"); process.exit(0); });
```

```bash
node scripts/seed_access_code.js
```

테스트 후 입장: 이름 `홍길동`, 입장코드 `1234` 입력

---

## 관리자 계정 설정

### Firebase Authentication에서 관리자 계정 생성

관리자 계정은 Firebase 콘솔에서 직접 생성합니다. 웹앱에 회원가입 기능은 없습니다.

1. Firebase 콘솔 → **Authentication** → **Users** 탭 이동
2. **사용자 추가** 클릭
3. 이메일과 비밀번호 입력 후 **사용자 추가**
   - 예: `admin@yourcompany.com` / `SecurePassword123!`
4. 생성된 계정으로 `http://localhost:3000/admin/login` 에서 로그인 확인

> **보안 주의:** 관리자 이메일/비밀번호는 팀 내부에서만 공유하세요.  
> 여러 명의 관리자가 필요하면 위 과정을 반복하여 각각 계정을 생성하세요.

### 로그인 흐름

```
/admin/login   → Firebase Auth 이메일/비밀번호 로그인
                 ↓ 성공
/admin         → 대시보드 (로그인 상태 유지)
                 ↓ 로그아웃 버튼 클릭
/admin/login   → 재로그인 필요
```

비로그인 상태에서 `/admin` 접속 시 자동으로 `/admin/login`으로 이동합니다.

---

## Firebase 연동 설정

### 1. Firebase 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com)에 접속합니다.
2. **프로젝트 추가** → 프로젝트 이름 입력 (예: `welcome-day-challenge`) → 생성
3. 프로젝트가 생성되면 **웹 앱 추가** (`</>` 아이콘) → 앱 이름 입력 → **앱 등록**
4. 표시된 `firebaseConfig` 값을 `.env.local`에 저장합니다 (아래 참고)

### 2. Firestore 데이터베이스 활성화

1. 좌측 사이드바 **빌드 > Firestore Database** → **데이터베이스 만들기**
2. **프로덕션 모드**로 시작 → 리전 선택 (`asia-northeast3` 권장, 서울)
3. 보안 규칙은 `docs/firebase_schema.md` 하단의 예시를 참고하세요.

### 3. Authentication 이메일/비밀번호 활성화

1. 좌측 사이드바 **빌드 > Authentication** → **시작하기**
2. **Sign-in method** 탭 → **이메일/비밀번호** 클릭 → **사용 설정** 토글 ON → 저장
3. **사용자** 탭 → **사용자 추가** → 관리자 이메일/비밀번호 등록

### 4. Admin SDK 서비스 계정 키 발급

1. **프로젝트 설정** (⚙ 아이콘) → **서비스 계정** 탭
2. **새 비공개 키 생성** → JSON 파일 다운로드 (`serviceAccountKey.json`)
3. 다운로드한 JSON에서 아래 값을 `.env.local`에 복사합니다:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### 5. 로컬 환경변수 설정

```bash
# .env.local.example을 복사해 실제 값을 채웁니다
cp .env.local.example .env.local
```

`.env.local` 파일에 Firebase 콘솔에서 복사한 값을 입력하세요.  
`.env.local`은 `.gitignore`에 포함되어 있으므로 git에 커밋되지 않습니다.

### 6. Vercel 환경변수 등록

1. [Vercel 대시보드](https://vercel.com) → 해당 프로젝트 → **Settings > Environment Variables**
2. 아래 변수를 모두 등록합니다:

| 변수명 | 값 출처 | 노출 범위 |
|--------|---------|-----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 앱 Config | 브라우저 공개 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 웹 앱 Config | 브라우저 공개 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 웹 앱 Config | 브라우저 공개 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 웹 앱 Config | 브라우저 공개 |
| `FIREBASE_PROJECT_ID` | 서비스 계정 JSON | 서버 전용 |
| `FIREBASE_CLIENT_EMAIL` | 서비스 계정 JSON | 서버 전용 |
| `FIREBASE_PRIVATE_KEY` | 서비스 계정 JSON | 서버 전용 ⚠ |

> ⚠ **FIREBASE_PRIVATE_KEY 주의**: Vercel 환경변수 입력 시 큰따옴표 없이 값만 입력하세요.  
> `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` 형태 그대로 붙여넣습니다.  
> `firebaseAdmin.ts`에서 `\n` → 실제 줄바꿈 변환 처리가 되어 있습니다.

### 관련 파일

| 파일 | 용도 |
|------|------|
| `src/lib/firebaseClient.ts` | 클라이언트 Firebase 초기화 (Auth, Firestore 클라이언트 SDK) |
| `src/lib/firebaseAdmin.ts` | 서버 전용 Firebase Admin 초기화 (API Route에서 사용) |
| `.env.local.example` | 환경변수 템플릿 |
| `docs/firebase_schema.md` | Firestore 컬렉션 스키마 정의 |

---

## Vercel 배포

```bash
npm install -g vercel
vercel
```

> 주의: Vercel 배포 시 `webapp/` 폴더를 루트로 지정하거나, `vercel.json`에서 `rootDirectory: "webapp"`을 설정하세요.
> `web_data/` 폴더가 서버 런타임에서 접근 가능해야 합니다 (`process.cwd()/../web_data`).
> 배포 환경에 따라 파일 경로를 환경 변수로 관리하는 것을 권장합니다.
