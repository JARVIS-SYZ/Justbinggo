// 5x5 빙고판 생성 (1~25 숫자를 무작위 배치)
export function generateBingoBoard(): number[][] {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const board: number[][] = [];
  for (let i = 0; i < 5; i++) {
    board.push(numbers.slice(i * 5, i * 5 + 5));
  }
  return board;
}

// 100개의 서로 다른 빙고판 미리 생성
export function generateAllBoards(): number[][][] {
  const boards: number[][][] = [];
  const boardSignatures = new Set<string>();
  while (boards.length < 100) {
    const board = generateBingoBoard();
    const signature = board.flat().join(',');
    if (!boardSignatures.has(signature)) {
      boardSignatures.add(signature);
      boards.push(board);
    }
  }
  return boards;
}

// 완성된 줄 찾기 (가로, 세로, 대각선) — 각 사용자의 markedNumbers 기준
export function findCompletedLines(
  board: number[][],
  markedNumbers: number[]
): number[][] {
  const markedSet = new Set(markedNumbers);
  const completedLines: number[][] = [];

  // 가로
  for (let row = 0; row < 5; row++) {
    if (board[row].every((n) => markedSet.has(n))) {
      completedLines.push([...board[row]]);
    }
  }
  // 세로
  for (let col = 0; col < 5; col++) {
    const column = board.map((row) => row[col]);
    if (column.every((n) => markedSet.has(n))) {
      completedLines.push(column);
    }
  }
  // 대각선 ↘
  const diag1 = [0, 1, 2, 3, 4].map((i) => board[i][i]);
  if (diag1.every((n) => markedSet.has(n))) completedLines.push(diag1);
  // 대각선 ↙
  const diag2 = [0, 1, 2, 3, 4].map((i) => board[i][4 - i]);
  if (diag2.every((n) => markedSet.has(n))) completedLines.push(diag2);

  return completedLines;
}

// 1줄 이상 완성 여부
export function checkBingo(board: number[][], markedNumbers: number[]): boolean {
  return findCompletedLines(board, markedNumbers).length >= 1;
}

// 세션 ID 생성
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
