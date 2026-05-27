import { db } from './firebase';
import { ref, set, get, update, onValue, remove } from 'firebase/database';
import { generateAllBoards } from './bingo';

// ── 타입 정의
export interface EventGame {
  status: 'waiting' | 'playing' | 'finished';
  boards: number[][][];
  winner: string | null;
  winnerBoardIndex: number | null;
  startedAt: number | null;
  updatedAt: number | null;
  eventCode: string;
  roomToken?: string;
}

export interface Participant {
  boardIndex: number;
  joinedAt: number;
  sessionId: string;
  markedNumbers: number[];
}

export interface ActivationCode {
  code: string;
  used: boolean;
  createdAt: number;
  activatedAt?: number;
}

// ══════════════════════════════════════
// 슈퍼어드민
// ══════════════════════════════════════

// 텍스트에서 코드 추가 (줄 구분)
export async function addActivationCodes(
  rawText: string
): Promise<{ added: number; skipped: number; skippedCodes: string[] }> {
  const lines = rawText
    .split(/\n/)
    .map(l => l.trim().toUpperCase())
    .filter(l => l.length > 0);

  const existingSnap = await get(ref(db, 'activationCodes'));
  const existing = existingSnap.exists()
    ? (existingSnap.val() as Record<string, ActivationCode>)
    : {};

  const skippedCodes: string[] = [];
  const toAdd: Record<string, ActivationCode> = {};

  for (const code of lines) {
    if (existing[code] || toAdd[code]) {
      skippedCodes.push(code);
    } else {
      toAdd[code] = { code, used: false, createdAt: Date.now() };
    }
  }

  for (const [key, val] of Object.entries(toAdd)) {
    await set(ref(db, `activationCodes/${key}`), val);
  }

  return {
    added: Object.keys(toAdd).length,
    skipped: skippedCodes.length,
    skippedCodes,
  };
}

// 활성화 코드 리셋 (used → false, activatedAt 제거)
export async function resetActivationCode(code: string): Promise<void> {
  await update(ref(db, `activationCodes/${code}`), {
    used: false,
    activatedAt: null,
  });
}

// 전체 활성화 코드 리셋
export async function resetAllActivationCodes(): Promise<void> {
  const snap = await get(ref(db, 'activationCodes'));
  if (!snap.exists()) return;
  const codes = snap.val() as Record<string, ActivationCode>;
  for (const code of Object.keys(codes)) {
    if (codes[code].used) {
      await update(ref(db, `activationCodes/${code}`), { used: false, activatedAt: null });
    }
  }
}

// 코드 개별 삭제
export async function deleteActivationCode(code: string): Promise<void> {
  await set(ref(db, `activationCodes/${code}`), null);
}

// 전체 코드 삭제
export async function deleteAllActivationCodes(): Promise<void> {
  await set(ref(db, 'activationCodes'), null);
}

// 활성화 코드 목록 구독
export function subscribeActivationCodes(
  callback: (codes: Record<string, ActivationCode> | null) => void
): () => void {
  return onValue(ref(db, 'activationCodes'), (snap) => callback(snap.val()));
}

// 코드 유효성 확인
export async function validateCode(code: string): Promise<'super' | 'event' | 'invalid'> {
  const SUPER_ADMIN_CODE = process.env.NEXT_PUBLIC_SUPER_ADMIN_CODE || 'SUPERADMIN';
  if (code === SUPER_ADMIN_CODE) return 'super';

  const snap = await get(ref(db, `activationCodes/${code}`));
  if (snap.exists()) {
    const data = snap.val() as ActivationCode;
    // 이미 다른 기기에서 사용 중인 코드인지 확인
    // localStorage에 저장된 코드와 같은 코드면 재접속 허용 (본인)
    // used지만 activatedBy가 없으면 최초 사용
    if (data.used && data.activatedAt) {
      // 이미 활성화된 코드 - 재접속은 localStorage로 처리되므로 여기선 차단
      return 'already_used' as any;
    }
    // 처음 사용 시 used: true + 활성화 시각 기록
    await update(ref(db, `activationCodes/${code}`), {
      used: true,
      activatedAt: Date.now(),
    });
    return 'event';
  }
  return 'invalid';
}

// ══════════════════════════════════════
// 이벤트 게임
// ══════════════════════════════════════

// 이벤트 초기화
// ── roomToken 생성
function generateRoomToken(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── roomToken → eventCode 실시간 구독
export function subscribeEventCodeByToken(
  token: string,
  callback: (eventCode: string | null) => void
): () => void {
  return onValue(ref(db, `roomTokens/${token}`), (snap) => {
    callback(snap.exists() ? (snap.val() as string) : null);
  });
}

export async function initializeEvent(eventCode: string): Promise<string> {
  // 기존 토큰 제거
  const oldSnap = await get(ref(db, `events/${eventCode}/roomToken`));
  if (oldSnap.exists()) {
    await set(ref(db, `roomTokens/${oldSnap.val()}`), null);
  }
  const token = generateRoomToken();
  const boards = generateAllBoards();
  const game: EventGame = {
    status: 'waiting',
    boards,
    winner: null,
    winnerBoardIndex: null,
    startedAt: null,
    updatedAt: Date.now(),
    eventCode,
    roomToken: token,
  };
  await set(ref(db, `events/${eventCode}`), game);
  await set(ref(db, `participants/${eventCode}`), null);
  await set(ref(db, `roomTokens/${token}`), eventCode);
  return token;
}

// 게임 시작
export async function startEvent(eventCode: string): Promise<void> {
  await update(ref(db, `events/${eventCode}`), {
    status: 'playing',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// 우승자 등록
export async function setEventWinner(
  eventCode: string,
  sessionId: string,
  boardIndex: number
): Promise<void> {
  await update(ref(db, `events/${eventCode}`), {
    status: 'finished',
    winner: sessionId,
    winnerBoardIndex: boardIndex,
    updatedAt: Date.now(),
  });
}

// 이벤트 게임 상태 구독
export function subscribeEventGame(
  eventCode: string,
  callback: (game: EventGame | null) => void
): () => void {
  return onValue(ref(db, `events/${eventCode}`), (snap) => callback(snap.val()));
}

// ══════════════════════════════════════
// 참가자
// ══════════════════════════════════════

// 빙고판 선택 (관객이 직접)
export async function selectBoard(
  eventCode: string,
  sessionId: string,
  boardIndex: number
): Promise<boolean> {
  const snap = await get(ref(db, `participants/${eventCode}`));
  const participants = snap.val() as Record<string, Participant> | null;

  // 이미 선택된 판인지 확인
  if (participants) {
    const taken = Object.values(participants).some(p => p.boardIndex === boardIndex);
    if (taken) return false;

    // 본인이 이미 다른 판 선택했는지
    if (participants[sessionId]) {
      // 기존 선택 해제 후 새로 선택
      await remove(ref(db, `participants/${eventCode}/${sessionId}`));
    }
  }

  await set(ref(db, `participants/${eventCode}/${sessionId}`), {
    boardIndex,
    sessionId,
    joinedAt: Date.now(),
    markedNumbers: [],
  } as Participant);

  return true;
}

// 숫자 토글
export async function toggleMark(
  eventCode: string,
  sessionId: string,
  number: number
): Promise<void> {
  const snap = await get(ref(db, `participants/${eventCode}/${sessionId}/markedNumbers`));
  const current: number[] = snap.val() ?? [];
  const updated = current.includes(number)
    ? current.filter(n => n !== number)
    : [...current, number];
  await set(ref(db, `participants/${eventCode}/${sessionId}/markedNumbers`), updated);
}

// 내 마킹 구독
export function subscribeMyMarks(
  eventCode: string,
  sessionId: string,
  callback: (marks: number[]) => void
): () => void {
  return onValue(ref(db, `participants/${eventCode}/${sessionId}/markedNumbers`), (snap) => {
    callback(snap.val() ?? []);
  });
}

// 참가자 목록 구독
export function subscribeParticipants(
  eventCode: string,
  callback: (p: Record<string, Participant> | null) => void
): () => void {
  return onValue(ref(db, `participants/${eventCode}`), (snap) => callback(snap.val()));
}

// 참가자 수 구독
export function subscribeParticipantCount(
  eventCode: string,
  callback: (count: number) => void
): () => void {
  return onValue(ref(db, `participants/${eventCode}`), (snap) => {
    const data = snap.val();
    callback(data ? Object.keys(data).length : 0);
  });
}

// 선택된 빙고판 인덱스 목록 구독 (관객 선택 화면용 실시간)
export function subscribeTakenBoards(
  eventCode: string,
  callback: (taken: Set<number>) => void
): () => void {
  return onValue(ref(db, `participants/${eventCode}`), (snap) => {
    const data = snap.val() as Record<string, Participant> | null;
    const taken = new Set(data ? Object.values(data).map(p => p.boardIndex) : []);
    callback(taken);
  });
}
