'use client';

import { useState, useRef } from 'react';
import { generateBingoBoard, findCompletedLines } from '@/lib/bingo';
import styles from './page.module.css';
import React from 'react';

type Phase = 'select' | 'play';

export default function GameEventPage() {
  const [phase, setPhase]                     = useState<Phase>('select');
  const [board, setBoard]                     = useState<number[][]>([]);
  const [boardIndex, setBoardIndex]           = useState<number | null>(null);
  const [markedNumbers, setMarkedNumbers]     = useState<number[]>([]);
  const [finished, setFinished]               = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);

  const [allBoards] = useState<number[][][]>(() =>
    Array.from({ length: 100 }, () => generateBingoBoard())
  );

  const handleSelectBoard = (idx: number) => {
    setBoard(allBoards[idx]);
    setBoardIndex(idx);
    setMarkedNumbers([]);
    setFinished(false);
    setPhase('play');
  };

  const handleCellClick = (num: number) => {
    if (finished) return;
    setMarkedNumbers(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const handleFinish = () => {
    if (!canFinish || finished) return;
    setFinished(true);
  };

  const handleBack = () => {
    setPhase('select');
    setBoardIndex(null);
    setBoard([]);
    setMarkedNumbers([]);
    setFinished(false);
    setSelectedPreview(null);
  };

  const instagramUrl = 'https://www.instagram.com/syz_jarvis?igsh=MWs4cjZtNWE0NmRsYw%3D%3D&utm_source=qr';
  const handleHiddenTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) window.open(instagramUrl, '_blank');
    lastTapRef.current = now;
  };

  const completedLines      = board.length ? findCompletedLines(board, markedNumbers) : [];
  const completedCells      = new Set(completedLines.flat());
  const canFinish           = (completedLines.length >= 1 || markedNumbers.length >= 5) && !finished;
  const completedLineCoords = board.length ? getCompletedLineCoords(board, markedNumbers) : [];

  // 빙고판 선택 화면
  if (phase === 'select') {
    return (
      <div className={styles.selectContainer}>
        <header className={styles.selectHeader}>
          <div className={styles.logoSmall}>⬡ BINGO</div>
          <button className={styles.hiddenBtn} onClick={handleHiddenTap} />
        </header>
        <div className={styles.selectInfo}>
          <h2 className={styles.selectTitle}>Select Your Bingo Card</h2>
          <p className={styles.selectSubtitle}>Tap a card to select it</p>
        </div>
        <div className={styles.cardGrid}>
          {allBoards.map((b, idx) => (
            <div
              key={idx}
              className={`${styles.boardCard} ${selectedPreview === idx ? styles.boardCardSelected : ''}`}
              onClick={() => setSelectedPreview(selectedPreview === idx ? null : idx)}
            >
              <div className={styles.boardCardTop}>
                <span className={styles.boardCardNum}>#{idx + 1}</span>
              </div>
              <div className={styles.cardBingoHeader}>
                {['B','I','N','G','O'].map(l => <span key={l}>{l}</span>)}
              </div>
              <div className={styles.cardGrid5}>
                {b.map((row, ri) => row.map((num, ci) => (
                  <div key={`${ri}-${ci}`} className={styles.cardCell}>{num}</div>
                )))}
              </div>
              {selectedPreview === idx && (
                <div
                  className={styles.cardSelectOverlay}
                  onClick={(e) => { e.stopPropagation(); handleSelectBoard(idx); }}
                >
                  <span>Select</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 게임 플레이 화면
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backToList} onClick={handleBack}>← Back</button>
        <div className={styles.logoSmall}>⬡ BINGO</div>
        <button className={styles.hiddenBtn} onClick={handleHiddenTap} />
      </header>

      <div className={styles.boardWrapper}>
        <div className={styles.boardHeader}>
          {['B','I','N','G','O'].map(l => <div key={l} className={styles.columnLabel}>{l}</div>)}
        </div>
        <div className={styles.boardContainer}>
          <div className={styles.board}>
            {board.map((row, ri) => row.map((num, ci) => {
              const isMarked = markedNumbers.includes(num);
              const isBingo  = completedCells.has(num);
              const showX    = finished && !isMarked;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`${styles.cell} ${isMarked ? styles.cellMarked : ''} ${isBingo ? styles.cellBingo : ''} ${showX ? styles.cellX : ''} ${!finished ? styles.cellClickable : ''}`}
                  onClick={() => handleCellClick(num)}
                >
                  {showX ? (
                    <div className={styles.xMark}>
                      <svg viewBox="0 0 40 40" className={styles.xSvg}>
                        <line x1="6" y1="6" x2="34" y2="34" />
                        <line x1="34" y1="6" x2="6" y2="34" />
                      </svg>
                    </div>
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
          {finished && completedLineCoords.map((line, i) => (
            <div key={i} className={styles.lineOverlay} style={line} />
          ))}
        </div>
      </div>

      <div className={styles.finishArea}>
        <button
          className={`${styles.finishBtn} ${canFinish ? styles.finishActive : ''} ${finished ? styles.finishDone : ''} ${!canFinish && !finished ? styles.finishPlaying : ''}`}
          onClick={handleFinish}
          disabled={!canFinish || finished}
        >
          {finished ? 'Done' : canFinish ? '🎉 FINISH' : 'In Progress'}
        </button>
        {!canFinish && !finished && (
          <p className={styles.finishHint}>Mark 5 numbers or complete a line</p>
        )}
      </div>
    </div>
  );
}

function getCompletedLineCoords(board: number[][], markedNumbers: number[]): React.CSSProperties[] {
  const markedSet = new Set(markedNumbers);
  const lines: React.CSSProperties[] = [];
  const CELL = 100 / 5;
  for (let r = 0; r < 5; r++) {
    if (board[r].every(n => markedSet.has(n)))
      lines.push({ top: `${CELL * r + CELL / 2}%`, left: '4%', width: '92%', height: '3px', transform: 'translateY(-50%)' });
  }
  for (let c = 0; c < 5; c++) {
    if (board.map(row => row[c]).every(n => markedSet.has(n)))
      lines.push({ left: `${CELL * c + CELL / 2}%`, top: '4%', height: '92%', width: '3px', transform: 'translateX(-50%)' });
  }
  if ([0,1,2,3,4].map(i => board[i][i]).every(n => markedSet.has(n)))
    lines.push({ top: '50%', left: '50%', width: '133%', height: '3px', transform: 'translate(-50%, -50%) rotate(45deg)' });
  if ([0,1,2,3,4].map(i => board[i][4-i]).every(n => markedSet.has(n)))
    lines.push({ top: '50%', left: '50%', width: '133%', height: '3px', transform: 'translate(-50%, -50%) rotate(-45deg)' });
  return lines;
}
