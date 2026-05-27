'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  subscribeGameState,
  subscribeParticipantCount,
  subscribeParticipants,
  initializeGame,
  startGame,
  GameState,
  Participant,
} from '@/lib/gameService';
import styles from './page.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [gameState, setGameState]         = useState<GameState | null>(null);
  const [participants, setParticipants]   = useState<Record<string, Participant> | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [qrDataUrl, setQrDataUrl]         = useState('');
  const [gameUrl, setGameUrl]             = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [copied, setCopied]               = useState(false);

  // ── 관리자 인증 확인
  useEffect(() => {
    const isAdmin = sessionStorage.getItem('bingo_admin');
    if (isAdmin !== 'true') { router.push('/'); return; }

    const url = `${window.location.origin}/game`;
    setGameUrl(url);
    QRCode.toDataURL(url, {
      width: 200, margin: 2,
      color: { dark: '#f0f6ff', light: '#0d1421' },
    }).then(setQrDataUrl);
  }, [router]);

  // ── Firebase 구독
  useEffect(() => {
    const u1 = subscribeGameState(setGameState);
    const u2 = subscribeParticipantCount(setParticipantCount);
    const u3 = subscribeParticipants(setParticipants);
    return () => { u1(); u2(); u3(); };
  }, []);

  const handleInitialize = async () => {
    if (!confirm('게임을 초기화하시겠습니까? 모든 데이터가 리셋됩니다.')) return;
    setIsInitializing(true);
    try { await initializeGame(); } finally { setIsInitializing(false); }
  };

  const handleStart = async () => { await startGame(); };
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPlaying  = gameState?.status === 'playing';
  const isFinished = gameState?.status === 'finished';

  // 우승자 정보
  const winnerEntry = participants && gameState?.winner
    ? participants[gameState.winner] : null;
  const winnerBoard = winnerEntry && gameState?.boards
    ? gameState.boards[winnerEntry.boardIndex] : null;

  // 참가자 배열 (boardIndex 순 정렬)
  const participantList = participants
    ? Object.values(participants).sort((a, b) => a.boardIndex - b.boardIndex)
    : [];

  return (
    <div className={styles.container}>
      {/* ── Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>⬡ BINGO</div>
          <span className={styles.adminBadge}>ADMIN</span>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.statusBadge} ${isPlaying ? styles.statusPlaying : isFinished ? styles.statusFinished : styles.statusWaiting}`}>
            {isFinished ? '🏆 게임 종료' : isPlaying ? '🎯 진행 중' : '⏳ 대기 중'}
          </div>
          <div className={styles.participantBadge}>
            👥 <strong>{participantCount}</strong>명
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* ── Left Panel */}
        <aside className={styles.leftPanel}>

          {/* 게임 제어 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>게임 제어</h2>
            <div className={styles.controlBtns}>
              <button className="btn btn-primary" onClick={handleStart} disabled={!gameState || isPlaying || isFinished}>
                ▶ 게임 시작
              </button>
              <button className="btn btn-danger" onClick={handleInitialize} disabled={isInitializing}>
                {isInitializing ? '초기화 중...' : '↺ 초기화'}
              </button>
            </div>
          </div>

          {/* 우승자 */}
          {isFinished && winnerEntry && (
            <div className={styles.winnerCard}>
              <div className={styles.winnerEmoji}>🏆</div>
              <h3>우승자 발생!</h3>
              <p className={styles.winnerBoardNum}>빙고판 #{winnerEntry.boardIndex + 1}</p>
              <p className={styles.winnerSession}>{gameState?.winner?.substring(0, 14)}...</p>
              {winnerBoard && (
                <div className={styles.winnerMiniBoard}>
                  {winnerBoard.map((row, ri) => (
                    <div key={ri} className={styles.winnerRow}>
                      {row.map((num) => {
                        const marked = winnerEntry.markedNumbers?.includes(num);
                        return (
                          <span key={num} className={`${styles.winnerCell} ${marked ? styles.winnerMarked : ''}`}>
                            {num}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QR / URL */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>관객 접속</h2>
            {qrDataUrl && (
              <div className={styles.qrWrapper}>
                <img src={qrDataUrl} alt="QR" className={styles.qrImage} />
              </div>
            )}
            <div className={styles.urlBox}><span className={styles.urlText}>{gameUrl}</span></div>
            <button className="btn btn-ghost" style={{width:'100%',marginTop:8}} onClick={handleCopyUrl}>
              {copied ? '✓ 복사됨!' : '🔗 URL 복사'}
            </button>
          </div>
        </aside>

        {/* ── Right Panel: 빙고판 목록 */}
        <main className={styles.rightPanel}>
          <div className={styles.card} style={{height:'100%',display:'flex',flexDirection:'column'}}>
            <h2 className={styles.cardTitle}>
              빙고판 목록
              <span className={styles.calledCount}>{participantCount} / 100</span>
            </h2>

            {!gameState ? (
              <div className={styles.emptyMsg}>게임을 초기화하면 빙고판 목록이 표시됩니다.</div>
            ) : (
              <div className={styles.boardList}>
                {Array.from({ length: 100 }, (_, i) => i).map((idx) => {
                  const participant = participantList.find(p => p.boardIndex === idx);
                  const board = gameState.boards?.[idx];
                  const markedNumbers: number[] = participant?.markedNumbers ?? [];
                  const isWinnerBoard = winnerEntry?.boardIndex === idx;

                  return (
                    <BoardCard
                      key={idx}
                      index={idx}
                      board={board}
                      participant={participant ?? null}
                      markedNumbers={markedNumbers}
                      isWinner={isWinnerBoard}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── 개별 빙고판 카드 */
interface BoardCardProps {
  index: number;
  board: number[][];
  participant: Participant | null;
  markedNumbers: number[];
  isWinner: boolean;
}

function BoardCard({ index, board, participant, markedNumbers, isWinner }: BoardCardProps) {
  const markedSet = new Set(markedNumbers);
  const isEmpty = !participant;

  // 완성 줄 계산 (표시용)
  const completedCount = (() => {
    if (!board || markedNumbers.length === 0) return 0;
    let count = 0;
    for (let r = 0; r < 5; r++) {
      if (board[r].every(n => markedSet.has(n))) count++;
    }
    for (let c = 0; c < 5; c++) {
      if (board.map(row => row[c]).every(n => markedSet.has(n))) count++;
    }
    if ([0,1,2,3,4].map(i => board[i][i]).every(n => markedSet.has(n))) count++;
    if ([0,1,2,3,4].map(i => board[i][4-i]).every(n => markedSet.has(n))) count++;
    return count;
  })();

  return (
    <div className={`${styles.boardCard} ${isEmpty ? styles.boardCardEmpty : ''} ${isWinner ? styles.boardCardWinner : ''}`}>
      <div className={styles.boardCardHeader}>
        <span className={styles.boardCardNum}>#{index + 1}</span>
        {isEmpty
          ? <span className={styles.boardCardEmpty2}>미배정</span>
          : <span className={styles.boardCardActive}>참가 중</span>
        }
        {completedCount > 0 && (
          <span className={styles.boardCardBingo}>{completedCount}줄</span>
        )}
        {isWinner && <span className={styles.boardCardWinBadge}>🏆 우승</span>}
      </div>

      {board && (
        <div className={styles.miniGrid}>
          {board.map((row, ri) =>
            row.map((num, ci) => {
              const isMarked = markedSet.has(num);
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`${styles.miniCell} ${isMarked ? styles.miniMarked : ''} ${isEmpty ? styles.miniEmpty : ''}`}
                >
                  {num}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
