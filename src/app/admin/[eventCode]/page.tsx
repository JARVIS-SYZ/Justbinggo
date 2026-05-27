'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  subscribeEventGame, subscribeParticipants, subscribeParticipantCount,
  initializeEvent, startEvent, EventGame, Participant,
} from '@/lib/gameService';
import styles from './page.module.css';

export default function AdminEventPage() {
  const router   = useRouter();
  const params   = useParams();
  const eventCode = (params.eventCode as string).toUpperCase();

  const [game, setGame]                 = useState<EventGame | null>(null);
  const [participants, setParticipants] = useState<Record<string, Participant> | null>(null);
  const [count, setCount]               = useState(0);
  const [qrDataUrl, setQrDataUrl]       = useState('');
  const [gameUrl, setGameUrl]           = useState('');
  const [isInit, setIsInit]             = useState(false);
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem(`bingo_admin_${eventCode}`);
    if (ok !== 'true') { router.push('/'); return; }

    const u1 = subscribeEventGame(eventCode, (g) => {
      setGame(g);
      // roomToken 기반 QR 업데이트
      if (g?.roomToken) {
        const url = `${window.location.origin}/game/${g.roomToken}`;
        setGameUrl(url);
        QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#f0f6ff', light: '#0d1421' } }).then(setQrDataUrl);
      }
    });
    const u2 = subscribeParticipants(eventCode, setParticipants);
    const u3 = subscribeParticipantCount(eventCode, setCount);
    return () => { u1(); u2(); u3(); };
  }, [eventCode, router]);

  const handleInit = async () => {
    if (!confirm('게임을 초기화하시겠습니까?')) return;
    setIsInit(true);
    await initializeEvent(eventCode);
    setIsInit(false);
  };

  const isPlaying  = game?.status === 'playing';
  const isFinished = game?.status === 'finished';
  const participantList = participants ? Object.values(participants).sort((a, b) => a.boardIndex - b.boardIndex) : [];
  const winnerEntry = participants && game?.winner ? participants[game.winner] : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>←</button>
          <div className={styles.logo}>⬡ BINGO</div>
          <span className={styles.eventBadge}>{eventCode}</span>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.statusBadge} ${isPlaying ? styles.statusPlaying : isFinished ? styles.statusFinished : styles.statusWaiting}`}>
            {isFinished ? '🏆 게임 종료' : isPlaying ? '🎯 진행 중' : '⏳ 대기 중'}
          </div>
          <div className={styles.participantBadge}>👥 <strong>{count}</strong>명</div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <aside className={styles.leftPanel}>
          {/* 제어 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>게임 제어</h2>
            <div className={styles.controlBtns}>
              <button className="btn btn-primary" onClick={() => startEvent(eventCode)} disabled={!game || isPlaying || isFinished}>▶ 게임 시작</button>
              <button className="btn btn-danger" onClick={handleInit} disabled={isInit}>{isInit ? '초기화 중...' : '↺ 초기화'}</button>
            </div>
          </div>

          {/* 우승자 */}
          {isFinished && winnerEntry && (
            <div className={styles.winnerCard}>
              <div className={styles.winnerEmoji}>🏆</div>
              <h3>우승자 발생!</h3>
              <p className={styles.winnerBoardNum}>빙고판 #{winnerEntry.boardIndex + 1}</p>
            </div>
          )}

          {/* QR */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>관객 접속</h2>
            {qrDataUrl && <div className={styles.qrWrapper}><img src={qrDataUrl} alt="QR" className={styles.qrImage} /></div>}
            <div className={styles.urlBox}><span className={styles.urlText}>{gameUrl}</span></div>
            <button className="btn btn-ghost" style={{width:'100%',marginTop:8}} onClick={() => { navigator.clipboard.writeText(gameUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>
              {copied ? '✓ 복사됨!' : '🔗 URL 복사'}
            </button>
          </div>
        </aside>

        {/* 빙고판 목록 */}
        <main className={styles.rightPanel}>
          <div className={styles.card} style={{height:'100%',display:'flex',flexDirection:'column'}}>
            <h2 className={styles.cardTitle}>
              빙고판 목록
              <span className={styles.countBadge}>{count} / 100</span>
            </h2>
            {!game ? (
              <div className={styles.emptyMsg}>초기화 버튼을 눌러 게임을 준비하세요.</div>
            ) : (
              <div className={styles.boardList}>
                {Array.from({length:100},(_,i)=>i).map(idx => {
                  const p = participantList.find(p => p.boardIndex === idx);
                  const board = game.boards?.[idx];
                  const marked = new Set(p?.markedNumbers ?? []);
                  const isWinner = winnerEntry?.boardIndex === idx;

                  // 완성 줄 수 계산
                  let lines = 0;
                  if (board && p?.markedNumbers?.length) {
                    for (let r=0;r<5;r++) if (board[r].every(n=>marked.has(n))) lines++;
                    for (let c=0;c<5;c++) if (board.map(row=>row[c]).every(n=>marked.has(n))) lines++;
                    if ([0,1,2,3,4].map(i=>board[i][i]).every(n=>marked.has(n))) lines++;
                    if ([0,1,2,3,4].map(i=>board[i][4-i]).every(n=>marked.has(n))) lines++;
                  }

                  return (
                    <div key={idx} className={`${styles.boardCard} ${!p ? styles.boardEmpty : ''} ${isWinner ? styles.boardWinner : ''}`}>
                      <div className={styles.boardCardHeader}>
                        <span className={styles.boardNum}>#{idx+1}</span>
                        {!p ? <span className={styles.boardFree}>미선택</span> : <span className={styles.boardTaken}>참가중</span>}
                        {lines > 0 && <span className={styles.boardLines}>{lines}줄</span>}
                        {isWinner && <span className={styles.boardWinBadge}>🏆</span>}
                      </div>
                      {board && (
                        <div className={styles.miniGrid}>
                          {board.map((row,ri)=>row.map((num,ci)=>(
                            <div key={`${ri}-${ci}`} className={`${styles.miniCell} ${marked.has(num)?styles.miniMarked:''}`}>{num}</div>
                          )))}
                        </div>
                      )}
                    </div>
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
