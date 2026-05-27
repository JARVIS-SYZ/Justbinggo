'use client';

import { useState, useEffect, useRef } from 'react';
import {
  subscribeGameState,
  subscribeMyMarks,
  joinGame,
  setWinner,
  toggleMark,
  GameState,
} from '@/lib/gameService';
import {
  findCompletedLines,
  checkBingo,
  generateSessionId,
} from '@/lib/bingo';
import WinnerOverlay from '@/components/WinnerOverlay';
import styles from './page.module.css';

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionId, setSessionId]   = useState('');
  const [boardIndex, setBoardIndex] = useState<number | null>(null);
  const [board, setBoard]           = useState<number[][]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [joinError, setJoinError]   = useState('');
  const [isWinner, setIsWinner]     = useState(false);
  const [finishing, setFinishing]   = useState(false);
  const joinedRef  = useRef(false);

  // ── 세션 초기화
  useEffect(() => {
    let sid = localStorage.getItem('bingo_session');
    if (!sid) { sid = generateSessionId(); localStorage.setItem('bingo_session', sid); }
    setSessionId(sid);
  }, []);

  // ── 게임 상태 구독
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeGameState(async (state) => {
      setGameState(state);

      // 게임 리셋 감지
      if (state?.status === 'waiting') {
        joinedRef.current = false;
        setBoardIndex(null);
        setBoard([]);
        setMarkedNumbers([]);
        setIsWinner(false);
        setFinishing(false);
      }

      // 최초 참가
      if (state && !joinedRef.current) {
        joinedRef.current = true;
        setIsLoading(true);
        const idx = await joinGame(sessionId);
        if (idx !== null) {
          setBoardIndex(idx);
          setBoard(state.boards[idx]);
        } else {
          setJoinError('빙고판이 모두 소진되었습니다 (100명 초과).');
        }
        setIsLoading(false);
      } else if (!state) {
        setIsLoading(false);
      }

      // 내가 우승자인지
      if (state?.winner === sessionId) setIsWinner(true);
    });
    return unsub;
  }, [sessionId]);

  // ── 보드 갱신 (초기화 후 boards 변경 시)
  useEffect(() => {
    if (gameState?.boards && boardIndex !== null) {
      setBoard(gameState.boards[boardIndex]);
    }
  }, [gameState?.boards, boardIndex]);

  // ── 내 마킹 실시간 구독
  useEffect(() => {
    if (!sessionId || boardIndex === null) return;
    return subscribeMyMarks(sessionId, setMarkedNumbers);
  }, [sessionId, boardIndex]);

  // ── 숫자 클릭 (토글)
  const handleCellClick = async (num: number) => {
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.winner) return;
    await toggleMark(sessionId, num);
  };

  // ── FINISH 버튼
  const handleFinish = async () => {
    if (!canFinish || finishing) return;
    setFinishing(true);
    await setWinner(sessionId, boardIndex!);
  };

  const isPlaying   = gameState?.status === 'playing';
  const isFinished  = gameState?.status === 'finished';
  const completedLines = board.length ? findCompletedLines(board, markedNumbers) : [];
  const canFinish   = isPlaying && !isFinished && completedLines.length >= 1 && !isWinner;
  const completedCells = new Set(completedLines.flat());
  const iLost       = isFinished && gameState?.winner !== sessionId;

  // ── 로딩 / 에러 / 대기
  if (!gameState && !isLoading) return (
    <div className={styles.waiting}>
      <div className={styles.waitingIcon}>⬡</div>
      <h1>게임 준비 중</h1>
      <p>관리자가 게임을 초기화하면 빙고판이 표시됩니다.</p>
    </div>
  );
  if (isLoading || (!board.length && !joinError)) return (
    <div className={styles.waiting}>
      <div className={styles.loadingSpinner} />
      <p>빙고판 배정 중...</p>
    </div>
  );
  if (joinError) return (
    <div className={styles.waiting}>
      <div className={styles.waitingIcon}>⚠</div>
      <h1>{joinError}</h1>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* 우승 오버레이 */}
      {isWinner && <WinnerOverlay board={board} markedNumbers={markedNumbers} />}

      {/* 게임 종료 배너 */}
      {iLost && (
        <div className={styles.gameOverBanner}>
          🏆 다른 참가자가 빙고를 완성했습니다
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoSmall}>⬡ BINGO</div>
        <div className={styles.gameInfo}>
          <span className={styles.boardNum}>#{(boardIndex ?? 0) + 1}</span>
          <span className={styles.bingoCount}>
            {completedLines.length > 0 ? `🎉 ${completedLines.length}줄 완성!` : `0줄`}
          </span>
        </div>
      </header>

      {/* 상태 바 */}
      {gameState?.status === 'waiting' && (
        <div className={styles.statusBar}>⏳ 게임 시작을 기다리고 있습니다...</div>
      )}
      {isPlaying && (
        <div className={styles.hintBar}>
          숫자를 눌러 마킹 · 다시 누르면 취소
        </div>
      )}

      {/* 빙고판 */}
      <div className={styles.boardWrapper}>
        <div className={styles.boardHeader}>
          {['B','I','N','G','O'].map((l) => (
            <div key={l} className={styles.columnLabel}>{l}</div>
          ))}
        </div>
        <div className={styles.board}>
          {board.map((row, ri) =>
            row.map((num, ci) => {
              const isMarked  = markedNumbers.includes(num);
              const isBingo   = completedCells.has(num);
              const isLoserX  = iLost && !isMarked;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`
                    ${styles.cell}
                    ${isMarked  ? styles.cellMarked : ''}
                    ${isBingo   ? styles.cellBingo  : ''}
                    ${isLoserX  ? styles.cellX      : ''}
                    ${isPlaying && !isFinished ? styles.cellClickable : ''}
                  `}
                  onClick={() => handleCellClick(num)}
                >
                  {isLoserX ? (
                    <span className={styles.xMark}>×</span>
                  ) : (
                    <>
                      <span className={styles.cellNum}>{num}</span>
                      {isMarked && (
                        <div className={styles.circle}>
                          <svg viewBox="0 0 40 40" className={styles.circleSvg}>
                            <circle cx="20" cy="20" r="17" />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FINISH 버튼 영역 */}
      <div className={styles.finishArea}>
        <button
          className={`${styles.finishBtn} ${canFinish ? styles.finishActive : ''}`}
          onClick={handleFinish}
          disabled={!canFinish || finishing}
        >
          {finishing ? '처리 중...' : canFinish ? '🎉 BINGO! FINISH' : 'FINISH'}
        </button>
        {!canFinish && isPlaying && (
          <p className={styles.finishHint}>1줄 완성 시 활성화됩니다</p>
        )}
      </div>
    </div>
  );
}
