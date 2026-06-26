# Firestore 데이터 스키마

이 문서는 웰컴데이 AI 챌린지 앱에서 사용하는 Firestore 컬렉션 구조를 정의합니다.

---

## 컬렉션 구조 개요

```
Firestore
├── accessCodes/{code}        # 입장코드 목록
├── participants/{participantId}  # 참여자 목록
└── submissions/{submissionId}    # 제출 결과 목록
```

---

## accessCodes/{code}

입장코드 하나를 문서 하나로 관리합니다. `{code}`는 입장코드 문자열 자체를 document ID로 사용합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `code` | `string` | 입장코드 (document ID와 동일) |
| `title` | `string` | 코드 설명 레이블 (예: "1조", "오전반") |
| `active` | `boolean` | 현재 유효한 코드 여부 |
| `createdAt` | `Timestamp` | 코드 생성 시각 |
| `expiresAt` | `Timestamp \| null` | 만료 시각. null이면 무기한 |
| `createdBy` | `string \| null` | 생성한 관리자 UID 또는 이메일 |

**예시 문서 (`accessCodes/WD2025A`)**
```json
{
  "code": "WD2025A",
  "title": "2025 웰컴데이 1조",
  "active": true,
  "createdAt": "2025-07-25T09:00:00Z",
  "expiresAt": "2025-07-25T18:00:00Z",
  "createdBy": "admin@nextwave.co.kr"
}
```

---

## participants/{participantId}

입장코드를 입력한 참여자를 기록합니다. `{participantId}`는 Firestore auto-ID입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | `string` | 참여자 이름 |
| `department` | `string` | 부서명 (선택 입력) |
| `code` | `string` | 사용한 입장코드 |
| `enteredAt` | `Timestamp` | 입장 시각 |
| `status` | `"entered" \| "submitted"` | 현재 상태 |
| `finalScore` | `number \| null` | 최종 제출 점수. 미제출 시 null |
| `lastSubmittedAt` | `Timestamp \| null` | 마지막 제출 시각. 미제출 시 null |

**예시 문서**
```json
{
  "name": "홍길동",
  "department": "마케팅팀",
  "code": "WD2025A",
  "enteredAt": "2025-07-25T09:15:00Z",
  "status": "submitted",
  "finalScore": 80,
  "lastSubmittedAt": "2025-07-25T09:42:00Z"
}
```

---

## submissions/{submissionId}

제출된 답안과 채점 결과를 저장합니다. `{submissionId}`는 Firestore auto-ID입니다.  
한 참여자가 재제출하면 새 문서가 추가됩니다 (이력 보존).

| 필드 | 타입 | 설명 |
|------|------|------|
| `participantId` | `string` | 연결된 participants 문서 ID |
| `code` | `string` | 사용한 입장코드 |
| `name` | `string` | 참여자 이름 (비정규화) |
| `department` | `string` | 부서명 (비정규화) |
| `answers` | `object` | 제출한 원본 답안 (`{ Q1: "B", Q2: "34", ... }`) |
| `totalScore` | `number` | 채점 결과 총점 |
| `maxScore` | `number` | 만점 (현재 100) |
| `percentage` | `number` | 정답률 (0~100) |
| `questionResults` | `array` | 문항별 채점 결과 배열 |
| `submittedAt` | `Timestamp` | 제출 시각 |

**questionResults 배열 요소 구조**
```typescript
{
  questionId: string;   // "Q1" ~ "Q5"
  title: string;        // 문항 제목
  score: number;        // 획득 점수
  maxScore: number;     // 문항 만점
  correct: boolean;     // 완전 정답 여부
  feedback: string;     // 피드백 메시지
}
```

**예시 문서**
```json
{
  "participantId": "abc123xyz",
  "code": "WD2025A",
  "name": "홍길동",
  "department": "마케팅팀",
  "answers": {
    "Q1": "B",
    "Q2": "34",
    "Q3": ["B", "D", "E"],
    "Q4": { "S1": "P1", "S2": "P3", "S3": "P4", "S4": "P2" },
    "Q5": ["A", "C", "E"]
  },
  "totalScore": 100,
  "maxScore": 100,
  "percentage": 100,
  "questionResults": [
    { "questionId": "Q1", "title": "행사 장소", "score": 20, "maxScore": 20, "correct": true, "feedback": "..." }
  ],
  "submittedAt": "2025-07-25T09:42:00Z"
}
```

---

## Firestore 보안 규칙 (예시)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 입장코드: 읽기만 허용 (유효성 검사용)
    match /accessCodes/{code} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // 참여자: 서버에서만 쓰기 (API Route 경유)
    match /participants/{participantId} {
      allow read, write: if false; // 클라이언트 직접 접근 차단
    }

    // 제출 결과: 서버에서만 쓰기
    match /submissions/{submissionId} {
      allow read, write: if false; // 클라이언트 직접 접근 차단
    }
  }
}
```

> **참고**: participants와 submissions는 클라이언트에서 직접 접근하지 않습니다.  
> 모든 쓰기는 `src/app/api/` 하위 API Route(서버)에서 `firebaseAdmin.ts`를 통해 이루어집니다.
