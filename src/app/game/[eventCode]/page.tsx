'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  subscribeEventGame, subscribeTakenBoards, subscribeMyMarks,
  selectBoard, setEventWinner, toggleMark, EventGame,
} from '@/lib/gameService';
import { findCompletedLines, checkBingo, generateSessionId } from '@/lib/bingo';
import WinnerOverlay from '@/components/WinnerOverlay';
import styles from './page.module.css';

type Phase = 'select' | 'play';

export default function GameEventPage() {
  const params    = useParams();
  const eventCode = (params.eventCode as string).toUpperCase();

  const [sessionId, setSessionId]       = useState('');
  const [game, setGame]                 = useState<EventGame | null>(null);
  const [takenBoards, setTakenBoards]   = useState<Set<number>>(new Set());
  const [phase, setPhase]               = useState<Phase>('select');
  const [boardIndex, setBoardIndex]     = useState<number | null>(null);
  const [board, setBoard]               = useState<number[][]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [isWinner, setIsWinner]         = useState(false);
  const [finishing, setFinishing]       = useState(false);
  const [preview, setPreview]           = useState<number | null>(null); // hover preview
  const winnerReported = useRef(false);

  // 세션 초기화
  useEffect(() => {
    let sid = localStorage.getItem(`bingo_session_${eventCode}`);
    if (!sid) { sid = generateSessionId(); localStorage.setItem(`bingo_session_${eventCode}`, sid); }
    setSessionId(sid);

    // 이미 선택한 판 복원
    const saved = localStorage.getItem(`bingo_board_${eventCode}`);
    if (saved !== null) {
      setBoardIndex(Number(saved));
      setPhase('play');
    }
  }, [eventCode]);

  // 게임 상태 구독
  useEffect(() => {
    const u1 = subscribeEventGame(eventCode, (g) => {
      setGame(g);
      if (g?.status === 'waiting') {
        // 초기화 시 선택 리셋
        localStorage.removeItem(`bingo_board_${eventCode}`);
        setBoardIndex(null);
        setPhase('select');
        setMarkedNumbers([]);
        setIsWinner(false);
        winnerReported.current = false;
      }
      if (g?.winner === sessionId) setIsWinner(true);
    });
    const u2 = subscribeTakenBoards(eventCode, setTakenBoards);
    return () => { u1(); u2(); };
  }, [eventCode, sessionId]);

  // 보드 업데이트
  useEffect(() => {
    if (game?.boards && boardIndex !== null) setBoard(game.boards[boardIndex]);
  }, [game?.boards, boardIndex]);

  // 마킹 구독
  useEffect(() => {
    if (!sessionId || boardIndex === null) return;
    return subscribeMyMarks(eventCode, sessionId, setMarkedNumbers);
  }, [eventCode, sessionId, boardIndex]);

  // 빙고판 선택
  const handleSelectBoard = async (idx: number) => {
    if (takenBoards.has(idx)) return;
    const ok = await selectBoard(eventCode, sessionId, idx);
    if (ok) {
      setBoardIndex(idx);
      localStorage.setItem(`bingo_board_${eventCode}`, String(idx));
      setPhase('play');
    } else {
      alert('이미 다른 사람이 선택한 빙고판입니다. 다른 번호를 선택해주세요.');
    }
  };

  // 숫자 토글
  const handleCellClick = async (num: number) => {
    if (!game || game.status !== 'playing' || game.winner) return;
    await toggleMark(eventCode, sessionId, num);
  };

  // FINISH
  const handleFinish = async () => {
    if (!canFinish || finishing || winnerReported.current) return;
    winnerReported.current = true;
    setFinishing(true);
    await setEventWinner(eventCode, sessionId, boardIndex!);
  };

  const isPlaying  = game?.status === 'playing';
  const isFinished = game?.status === 'finished';
  const completedLines = board.length ? findCompletedLines(board, markedNumbers) : [];
  const canFinish  = isPlaying && !isFinished && completedLines.length >= 1 && !isWinner;
  const completedCells = new Set(completedLines.flat());
  const iLost      = isFinished && game?.winner !== sessionId;

  // ── 대기 화면
  if (!game) return (
    <div className={styles.waiting}>
      <div className={styles.waitingIcon}>⬡</div>
      <h1>연결 중...</h1>
      <p>잠시만 기다려주세요.</p>
    </div>
  );

  // ── 빙고판 선택 화면
  if (phase === 'select') {
    const previewBoard = preview !== null && game.boards ? game.boards[preview] : null;
    return (
      <div className={styles.selectContainer}>
        <header className={styles.selectHeader}>
          <div className={styles.logoSmall}>⬡ BINGO</div>
          <div className={styles.eventCodeBadge}>{eventCode}</div>
        </header>

        <div className={styles.selectBody}>
          <div className={styles.selectLeft}>
            <h2 className={styles.selectTitle}>빙고판을 선택하세요</h2>
            <p className={styles.selectSubtitle}>
              번호를 클릭하면 빙고판 미리보기가 표시됩니다.<br/>
              <span className={styles.takenDot}/>이미 선택된 빙고판은 선택할 수 없습니다.
            </p>

            <div className={styles.boardNumberGrid}>
              {Array.from({length:100},(_,i)=>i).map(idx => {
                const taken = takenBoards.has(idx);
                const mine  = boardIndex === idx;
                return (
                  <button
                    key={idx}
                    className={`
                      ${styles.boardNumBtn}
                      ${taken  ? styles.boardNumTaken : ''}
                      ${mine   ? styles.boardNumMine  : ''}
                      ${preview === idx ? styles.boardNumHover : ''}
                    `}
                    onClick={() => handleSelectBoard(idx)}
                    onMouseEnter={() => setPreview(idx)}
                    onMouseLeave={() => setPreview(null)}
                    disabled={taken}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 미리보기 */}
          <div className={styles.selectRight}>
            {previewBoard ? (
              <div className={styles.previewCard}>
                <div className={styles.previewTitle}>
                  빙고판 #{(preview ?? 0) + 1}
                  {takenBoards.has(preview!) && <span className={styles.previewTaken}>선택 불가</span>}
                </div>
                <div className={styles.previewHeader}>
                  {['B','I','N','G','O'].map(l=><div key={l} className={styles.previewLabel}>{l}</div>)}
                </div>
                <div className={styles.previewGrid}>
                  {previewBoard.map((row,ri)=>row.map((num,ci)=>(
                    <div key={`${ri}-${ci}`} className={styles.previewCell}>{num}</div>
                  )))}
                </div>
                {!takenBoards.has(preview!) && (
                  <button className={styles.selectConfirmBtn} onClick={() => handleSelectBoard(preview!)}>
                    이 빙고판 선택하기
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.previewEmpty}>
                <div className={styles.previewEmptyIcon}>👆</div>
                <p>번호에 마우스를 올리면<br/>빙고판 미리보기가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 게임 플레이 화면
  return (
    <div className={styles.container}>
      {isWinner && <WinnerOverlay board={board} markedNumbers={markedNumbers} />}
      {iLost && <div className={styles.gameOverBanner}>🏆 다른 참가자가 빙고를 완성했습니다</div>}

      <header className={styles.header}>
        <div className={styles.logoSmall}>⬡ BINGO</div>
        <div className={styles.gameInfo}>
          <span className={styles.boardNum}>#{(boardIndex ?? 0) + 1}</span>
          <span className={styles.bingoCount}>
            {completedLines.length > 0 ? `🎉 ${completedLines.length}줄 완성!` : '0줄'}
          </span>
        </div>
      </header>

      {game?.status === 'waiting' && <div className={styles.statusBar}>⏳ 게임 시작을 기다리고 있습니다...</div>}
      {isPlaying && <div className={styles.hintBar}>숫자를 눌러 마킹 · 다시 누르면 취소</div>}

      <div className={styles.boardWrapper}>
        <div className={styles.boardHeader}>
          {['B','I','N','G','O'].map(l=><div key={l} className={styles.columnLabel}>{l}</div>)}
        </div>
        <div className={styles.board}>
          {board.map((row,ri)=>row.map((num,ci)=>{
            const isMarked = markedNumbers.includes(num);
            const isBingo  = completedCells.has(num);
            const isLoserX = iLost && !isMarked;
            return (
              <div key={`${ri}-${ci}`}
                className={`${styles.cell} ${isMarked?styles.cellMarked:''} ${isBingo?styles.cellBingo:''} ${isLoserX?styles.cellX:''} ${isPlaying&&!isFinished?styles.cellClickable:''}`}
                onClick={() => handleCellClick(num)}
              >
                {isLoserX ? <span className={styles.xMark}>×</span> : (
                  <>
                    <span className={styles.cellNum}>{num}</span>
                    {isMarked && <div className={styles.circle}><svg viewBox="0 0 40 40" className={styles.circleSvg}><circle cx="20" cy="20" r="17"/></svg></div>}
                  </>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      <div className={styles.finishArea}>
        <button
          className={`${styles.finishBtn} ${canFinish ? styles.finishActive : ''}`}
          onClick={handleFinish}
          disabled={!canFinish || finishing}
        >
          {finishing ? '처리 중...' : canFinish ? '🎉 BINGO! FINISH' : 'FINISH'}
        </button>
        {!canFinish && isPlaying && <p className={styles.finishHint}>1줄 완성 시 활성화됩니다</p>}
      </div>
    </div>
  );
}
