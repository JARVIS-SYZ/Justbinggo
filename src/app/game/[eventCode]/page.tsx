'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  subscribeEventGame, subscribeMyMarks,
  selectBoard, setEventWinner, toggleMark, subscribeEventCodeByToken, EventGame,
} from '@/lib/gameService';
import { findCompletedLines, generateSessionId } from '@/lib/bingo';
import styles from './page.module.css';

type Phase = 'select' | 'play';

export default function GameEventPage() {
  const params    = useParams();
  const eventCode = (params.eventCode as string).toUpperCase();

  const [sessionId, setSessionId]         = useState('');
  const [actualEventCode, setActualEventCode] = useState('');
  const [tokenInvalid, setTokenInvalid]   = useState(false);
  const [game, setGame]                   = useState<EventGame | null>(null);
  const [phase, setPhase]                 = useState<Phase>('select');
  const [boardIndex, setBoardIndex]       = useState<number | null>(null);
  const [board, setBoard]                 = useState<number[][]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [isWinner, setIsWinner]           = useState(false);
  const [finishing, setFinishing]         = useState(false);
  const [finished, setFinished]           = useState(false); // FINISH 누른 후 연출용
  const winnerReported = useRef(false);

  // roomToken → actualEventCode 변환
  useEffect(() => {
    const unsub = subscribeEventCodeByToken(eventCode, (code) => {
      if (code) setActualEventCode(code);
      else setTokenInvalid(true);
    });
    return unsub;
  }, [eventCode]);

  // 세션 초기화 - roomToken 기반으로 고정 (actualEventCode 무관)
  useEffect(() => {
    // sessionId는 roomToken 기반으로 고정 (페이지 로드 시 1번만)
    let sid = localStorage.getItem(`bingo_session_token_${eventCode}`);
    if (!sid) { sid = generateSessionId(); localStorage.setItem(`bingo_session_token_${eventCode}`, sid); }
    setSessionId(sid);
  }, [eventCode]);

  // 빙고판 복원 - actualEventCode 세팅 후
  useEffect(() => {
    if (!actualEventCode) return;
    const saved = localStorage.getItem(`bingo_board_${actualEventCode}`);
    if (saved !== null) { setBoardIndex(Number(saved)); setPhase('play'); }
  }, [actualEventCode]);

  // 게임 상태 구독
  useEffect(() => {
    if (!actualEventCode) return;
    const u1 = subscribeEventGame(actualEventCode, (g) => {
      setGame(g);
      if (g?.status === 'waiting') {
        localStorage.removeItem(`bingo_board_${actualEventCode}`);
        setBoardIndex(null); setPhase('select');
        setMarkedNumbers([]); setIsWinner(false);
        setFinished(false); winnerReported.current = false;
      }
      if (g?.winner === sessionId) setIsWinner(true);
    });
    return () => { u1(); };
  }, [actualEventCode, sessionId]);

  useEffect(() => {
    if (game?.boards && boardIndex !== null) setBoard(game.boards[boardIndex]);
  }, [game?.boards, boardIndex]);

  useEffect(() => {
    if (!sessionId || boardIndex === null) return;
    return subscribeMyMarks(actualEventCode, sessionId, setMarkedNumbers);
  }, [actualEventCode, sessionId, boardIndex]);

  const handleSelectBoard = async (idx: number) => {
    const ok = await selectBoard(actualEventCode, sessionId, idx);
    if (ok) {
      setBoardIndex(idx);
      localStorage.setItem(`bingo_board_${actualEventCode}`, String(idx));
      setPhase('play');
    }
  };

  const handleCellClick = async (num: number) => {
    if (!game || finished) return;
    await toggleMark(actualEventCode, sessionId, num);
  };

  const handleFinish = async () => {
    if (!canFinish || finishing) return;
    winnerReported.current = true;
    setFinishing(true);
    setFinished(true);
    await setEventWinner(actualEventCode, sessionId, boardIndex!);
  };

  const isPlaying      = game?.status === 'playing';
  const isFinished     = game?.status === 'finished';
  const completedLines = board.length ? findCompletedLines(board, markedNumbers) : [];
  const canFinish      = !isFinished && completedLines.length >= 1 && !finished;
  const completedCells = new Set(completedLines.flat());
  const iLost          = isFinished && game?.winner !== sessionId;

  // 완성된 줄의 방향/좌표 계산 (선 그리기용)
  const completedLineCoords = board.length ? getCompletedLineCoords(board, markedNumbers) : [];

  // ── 토큰 무효
  if (tokenInvalid) return (
    <div className={styles.waiting}>
      <div className={styles.waitingIcon}>⚠</div>
      <h1>Invalid Link</h1>
      <p>Please scan the correct QR code.</p>
    </div>
  );

  // ── 대기
  if (!actualEventCode || !game) return (
    <div className={styles.waiting}>
      <div className={styles.waitingIcon}>⬡</div>
      <h1>Connecting...</h1>
      <p>Please wait a moment.</p>
    </div>
  );

  // ── 빙고판 선택 (카드 목록)
  if (phase === 'select') {
    return (
      <div className={styles.selectContainer}>
        <header className={styles.selectHeader}>
          <div className={styles.logoSmall}>⬡ BINGO</div>
          <div className={styles.eventCodeBadge}>{eventCode}</div>
        </header>
        <div className={styles.selectInfo}>
          <h2 className={styles.selectTitle}>Select Your Bingo Card</h2>
          <p className={styles.selectSubtitle}>
            Tap a card to select it
          </p>
        </div>

        <div className={styles.cardGrid}>
          {Array.from({length:100}, (_,i) => i).map(idx => {
            const b = game.boards?.[idx];
            return (
              <div
                key={idx}
                className={styles.boardCard}
                onClick={() => handleSelectBoard(idx)}
              >
                <div className={styles.boardCardTop}>
                  <span className={styles.boardCardNum}>#{idx + 1}</span>
                </div>
                {/* BINGO 헤더 */}
                <div className={styles.cardBingoHeader}>
                  {['B','I','N','G','O'].map(l => <span key={l}>{l}</span>)}
                </div>
                {/* 숫자 그리드 */}
                {b && (
                  <div className={styles.cardGrid5}>
                    {b.map((row,ri) => row.map((num,ci) => (
                      <div key={`${ri}-${ci}`} className={styles.cardCell}>{num}</div>
                    )))}
                  </div>
                )}
                <div className={styles.cardSelectOverlay}>
                  <span>Select</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 게임 플레이
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoSmall}>⬡ BINGO</div>
        <div className={styles.gameInfo}>
          <span className={styles.boardNum}>#{(boardIndex ?? 0) + 1}</span>

        </div>
      </header>


      <div className={styles.boardWrapper}>
        <div className={styles.boardHeader}>
          {['B','I','N','G','O'].map(l => <div key={l} className={styles.columnLabel}>{l}</div>)}
        </div>

        {/* 빙고판 + 완성 줄 선 오버레이 */}
        <div className={styles.boardContainer}>
          <div className={styles.board}>
            {board.map((row, ri) => row.map((num, ci) => {
              const isMarked  = markedNumbers.includes(num);
              const isBingo   = completedCells.has(num);
              // FINISH 후: 마킹 안된 셀은 X, 완성줄은 금색 유지
              const showX     = finished && !isMarked;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`
                    ${styles.cell}
                    ${isMarked  ? styles.cellMarked   : ''}
                    ${isBingo   ? styles.cellBingo    : ''}
                    ${showX     ? styles.cellX        : ''}
                    ${isPlaying && !finished ? styles.cellClickable : ''}
                  `}
                  onClick={() => handleCellClick(num)}
                >
                  {showX ? (
                    <span className={styles.xMark}>×</span>
                  ) : (
                    <>
                      <span className={styles.cellNum}>{num}</span>
                      {isMarked && (
                        <div className={styles.circle}>
                          <svg viewBox="0 0 40 40" className={styles.circleSvg}>
                            <circle cx="20" cy="20" r="17"/>
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }))}
          </div>

          {/* 완성 줄 선 오버레이 (FINISH 후) */}
          {finished && completedLineCoords.map((line, i) => (
            <div key={i} className={styles.lineOverlay} style={line} />
          ))}
        </div>
      </div>

      <div className={styles.finishArea}>
        <button
          className={`${styles.finishBtn} ${canFinish ? styles.finishActive : ''} ${finished ? styles.finishDone : ''} ${isPlaying && !canFinish && !finished ? styles.finishPlaying : ''}`}
          onClick={handleFinish}
          disabled={!canFinish || finishing}
        >
          {finished ? 'Done' : canFinish ? '🎉 FINISH' : isPlaying ? 'In Progress' : 'Waiting'}
        </button>
        {!canFinish && isPlaying && !finished && <p className={styles.finishHint}>Complete 1 line to activate</p>}
      </div>
    </div>
  );
}

// ── 완성된 줄의 CSS 스타일 계산 (선 위치)
function getCompletedLineCoords(board: number[][], markedNumbers: number[]): React.CSSProperties[] {
  const markedSet = new Set(markedNumbers);
  const lines: React.CSSProperties[] = [];
  const CELL = 100 / 5; // 20%

  // 가로
  for (let r = 0; r < 5; r++) {
    if (board[r].every(n => markedSet.has(n))) {
      lines.push({
        top: `${CELL * r + CELL / 2}%`,
        left: '4%', width: '92%', height: '3px',
        transform: 'translateY(-50%)',
      });
    }
  }
  // 세로
  for (let c = 0; c < 5; c++) {
    if (board.map(row => row[c]).every(n => markedSet.has(n))) {
      lines.push({
        left: `${CELL * c + CELL / 2}%`,
        top: '4%', height: '92%', width: '3px',
        transform: 'translateX(-50%)',
      });
    }
  }
  // 대각선 ↘
  if ([0,1,2,3,4].map(i => board[i][i]).every(n => markedSet.has(n))) {
    lines.push({
      top: '50%', left: '50%',
      width: '133%', height: '3px',
      transform: 'translate(-50%, -50%) rotate(45deg)',
    });
  }
  // 대각선 ↙
  if ([0,1,2,3,4].map(i => board[i][4-i]).every(n => markedSet.has(n))) {
    lines.push({
      top: '50%', left: '50%',
      width: '133%', height: '3px',
      transform: 'translate(-50%, -50%) rotate(-45deg)',
    });
  }
  return lines;
}
