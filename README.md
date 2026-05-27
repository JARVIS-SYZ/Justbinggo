# 🎯 실시간 빙고 시스템

Firebase Realtime Database + Next.js 기반의 실시간 이벤트용 빙고 게임입니다.

---

## 📁 폴더 구조

```
bingo-app/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── page.tsx          # 관리자 페이지
│   │   │   └── page.module.css
│   │   ├── game/
│   │   │   ├── page.tsx          # 관객 빙고판 페이지
│   │   │   └── page.module.css
│   │   ├── globals.css           # 전역 스타일
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   ├── page.tsx              # 메인(패스코드) 페이지
│   │   └── page.module.css
│   ├── components/
│   │   ├── WinnerOverlay.tsx     # 우승 애니메이션
│   │   └── WinnerOverlay.module.css
│   └── lib/
│       ├── firebase.ts           # Firebase 초기화
│       ├── bingo.ts              # 빙고 로직
│       └── gameService.ts        # Firebase 서비스
├── .env.local.example            # 환경변수 예시
├── database.rules.json           # Firebase 보안 규칙
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 1단계: Firebase 프로젝트 설정

### 1-1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. **"프로젝트 추가"** 클릭
3. 프로젝트 이름 입력 (예: `my-bingo-game`)
4. Google Analytics: 선택 사항 (없어도 됨)
5. **"프로젝트 만들기"** 클릭

### 1-2. Realtime Database 생성
1. 좌측 메뉴 → **"빌드"** → **"Realtime Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. 위치: `us-central1` 또는 `asia-southeast1` 선택
4. 보안 규칙: **"테스트 모드에서 시작"** 선택 → **"사용 설정"**

### 1-3. 보안 규칙 설정
1. Realtime Database 화면에서 **"규칙"** 탭 클릭
2. 아래 내용으로 교체 후 **"게시"** 클릭:
```json
{
  "rules": {
    "game": {
      ".read": true,
      ".write": true
    },
    "participants": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 1-4. 웹 앱 등록 & 설정값 복사
1. Firebase 콘솔 홈 → **"앱 추가"** → 웹 아이콘(`</>`) 클릭
2. 앱 닉네임 입력 후 **"앱 등록"**
3. **`firebaseConfig` 객체의 값들을 복사해둠**

---

## 🔧 2단계: 로컬 개발 환경 설정

### 2-1. 프로젝트 설치
```bash
# bingo-app 폴더로 이동
cd bingo-app

# 패키지 설치
npm install
```

### 2-2. 환경변수 설정
```bash
# .env.local 파일 생성
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Firebase 콘솔에서 복사한 값으로 교체:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-bingo-game.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://my-bingo-game-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-bingo-game
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-bingo-game.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# 원하는 패스코드로 변경
NEXT_PUBLIC_ADMIN_PASSCODE=9999
```

### 2-3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속!

---

## 🎮 사용 방법

### 관리자 흐름
1. **http://localhost:3000** 접속
2. 패스코드 입력 (기본값: `1234`)
3. 관리자 페이지에서:
   - **"↺ 초기화"** 클릭 → 100개 빙고판 생성, 참가자 초기화
   - QR코드 또는 URL을 관객에게 공유
   - **"▶ 게임 시작"** 클릭
   - 숫자판에서 숫자 클릭 → 전체 동기화

### 관객 흐름
1. QR코드 스캔 또는 `/game` URL 접속
2. 자동으로 빙고판 배정 (100명 제한)
3. 관리자가 숫자 클릭 시 실시간 업데이트
4. 3줄 완성 시 자동 우승 처리 + 애니메이션

---

## ☁️ 3단계: Vercel 배포 (무료)

### 3-1. GitHub에 코드 올리기
```bash
git init
git add .
git commit -m "Initial bingo app"
# GitHub에서 새 저장소 만들고:
git remote add origin https://github.com/your_id/bingo-app.git
git push -u origin main
```

### 3-2. Vercel 배포
1. https://vercel.com 회원가입 (GitHub으로 로그인)
2. **"New Project"** → GitHub 저장소 선택
3. **"Environment Variables"** 섹션에 `.env.local`의 모든 값 추가
4. **"Deploy"** 클릭

배포 완료 후 자동으로 HTTPS URL이 생성됩니다.

### 3-3. Firebase에 도메인 추가 (중요!)
1. Firebase 콘솔 → **Authentication** (없다면 생략)
2. Realtime Database → **규칙**: 이미 설정됨 ✓

---

## 💡 자주 묻는 질문

**Q: 게임 중 새로고침하면 어떻게 되나요?**
A: localStorage에 세션ID가 저장되므로 같은 빙고판이 자동 복원됩니다.

**Q: 관객이 100명이 넘으면?**
A: "빙고판이 모두 소진되었습니다" 메시지가 표시됩니다. generateAllBoards()에서 100을 늘릴 수 있습니다.

**Q: 패스코드를 바꾸고 싶어요.**
A: `.env.local`의 `NEXT_PUBLIC_ADMIN_PASSCODE` 값을 변경하세요.

**Q: 빙고 3줄이 아닌 다른 조건으로 바꾸려면?**
A: `src/lib/bingo.ts`의 `checkBingo` 함수에서 `>= 3`을 원하는 숫자로 변경하세요.
