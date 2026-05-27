'use client';

import { useEffect, useState } from 'react';
import { findCompletedLines } from '@/lib/bingo';
import styles from './WinnerOverlay.module.css';

interface Props {
  board: number[][];
  markedNumbers: number[];
}

export default function WinnerOverlay({ board, markedNumbers }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  const completedLines = findCompletedLines(board, markedNumbers);
  const completedCells = new Set(completedLines.flat());
  const markedSet      = new Set(markedNumbers);

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#f59e0b','#3b82f6','#10b981','#06b6d4','#ef4444'][Math.floor(Math.random()*5)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className={`${styles.overlay} ${show ? styles.visible : ''}`}>
      {particles.map((p) => (
        <div key={p.id} className={styles.particle} style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          background: p.color,
          width: p.size, height: p.size,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }} />
      ))}

      <div className={styles.content}>
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.bingoText}>BINGO!</h1>
        <p className={styles.winnerText}>당신이 우승자입니다!</p>

        {/* 완성된 빙고판 미니 뷰 */}
        <div className={styles.miniBoard}>
          <div className={styles.miniBoardHeader}>
            {['B','I','N','G','O'].map((l) => (
              <div key={l} className={styles.miniLabel}>{l}</div>
            ))}
          </div>
          <div className={styles.miniGrid}>
            {board.map((row, ri) =>
              row.map((num, ci) => {
                const isMarked = markedSet.has(num);
                const isWinLine = completedCells.has(num);
                return (
                  <div key={`${ri}-${ci}`}
                    className={`${styles.miniCell} ${isMarked ? styles.miniCalled : ''} ${isWinLine ? styles.miniWin : ''} ${!isMarked ? styles.miniX : ''}`}
                  >
                    {!isMarked
                      ? <span className={styles.miniXMark}>×</span>
                      : <span className={styles.miniNum}>{num}</span>
                    }
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.winLines}>{completedLines.length}줄 완성!</div>
      </div>
    </div>
  );
}
