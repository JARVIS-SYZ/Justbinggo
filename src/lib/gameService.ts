import { db } from './firebase';
import {
  ref,
  set,
  get,
  update,
  onValue,
} from 'firebase/database';
import { generateAllBoards } from './bingo';

export interface GameState {
  status: 'waiting' | 'playing' | 'finished';
  boards: number[][][];
  winner: string | null;
  winnerBoardIndex: number | null;
  startedAt: number | null;
  updatedAt: number | null;
}

export interface Participant {
  boardIndex: number;
  joinedAt: number;
  sessionId: string;
  markedNumbers: number[];   // 각 사용자가 직접 표시한 숫자
}

// ── 게임 초기화
export async function initializeGame(): Promise<void> {
  const boards = generateAllBoards();
  const gameState: GameState = {
    status: 'waiting',
    boards,
    winner: null,
    winnerBoardIndex: null,
    startedAt: null,
    updatedAt: Date.now(),
  };
  await set(ref(db, 'game'), gameState);
  await set(ref(db, 'participants'), null);
}

// ── 게임 시작
export async function startGame(): Promise<void> {
  await update(ref(db, 'game'), {
    status: 'playing',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// ── 우승자 등록 (관객이 FINISH 버튼 눌렀을 때)
export async function setWinner(
  sessionId: string,
  boardIndex: number
): Promise<void> {
  await update(ref(db, 'game'), {
    status: 'finished',
    winner: sessionId,
    winnerBoardIndex: boardIndex,
    updatedAt: Date.now(),
  });
}

// ── 관객 참가 — 빙고판 배정
export async function joinGame(sessionId: string): Promise<number | null> {
  const [gameSnap, participantsSnap] = await Promise.all([
    get(ref(db, 'game')),
    get(ref(db, 'participants')),
  ]);

  const game = gameSnap.val() as GameState;
  if (!game) return null;

  const participants = participantsSnap.val() as Record<string, Participant> | null;

  // 재접속: 기존 자리 복원
  if (participants?.[sessionId]) return participants[sessionId].boardIndex;

  const usedIndices = new Set(
    participants ? Object.values(participants).map((p) => p.boardIndex) : []
  );

  let boardIndex = -1;
  for (let i = 0; i < 100; i++) {
    if (!usedIndices.has(i)) { boardIndex = i; break; }
  }
  if (boardIndex === -1) return null;

  await set(ref(db, `participants/${sessionId}`), {
    boardIndex,
    sessionId,
    joinedAt: Date.now(),
    markedNumbers: [],
  } as Participant);

  return boardIndex;
}

// ── 숫자 토글 (관객이 직접 마킹/마킹 취소)
export async function toggleMark(
  sessionId: string,
  number: number
): Promise<void> {
  const snap = await get(ref(db, `participants/${sessionId}/markedNumbers`));
  const current: number[] = snap.val() ?? [];
  const updated = current.includes(number)
    ? current.filter((n) => n !== number)
    : [...current, number];
  await set(ref(db, `participants/${sessionId}/markedNumbers`), updated);
}

// ── 내 마킹 목록 실시간 구독
export function subscribeMyMarks(
  sessionId: string,
  callback: (marks: number[]) => void
): () => void {
  return onValue(ref(db, `participants/${sessionId}/markedNumbers`), (snap) => {
    callback(snap.val() ?? []);
  });
}

// ── 참가자 수 실시간 구독
export function subscribeParticipantCount(
  callback: (count: number) => void
): () => void {
  return onValue(ref(db, 'participants'), (snap) => {
    const data = snap.val();
    callback(data ? Object.keys(data).length : 0);
  });
}

// ── 게임 상태 실시간 구독
export function subscribeGameState(
  callback: (state: GameState | null) => void
): () => void {
  return onValue(ref(db, 'game'), (snap) => {
    callback(snap.val() as GameState | null);
  });
}

// ── 전체 참가자 목록 실시간 구독 (관리자용)
export function subscribeParticipants(
  callback: (participants: Record<string, Participant> | null) => void
): () => void {
  return onValue(ref(db, 'participants'), (snap) => {
    callback(snap.val());
  });
}
