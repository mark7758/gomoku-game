/*
 * 五子棋 Gomoku
 * 15x15 棋盘，支持双人对战与人机对战（简单启发式 AI）
 */
(function () {
  "use strict";

  const BOARD_SIZE = 15;          // 15 路棋盘
  const CELL = 40;                // 每格像素
  const PADDING = 20;             // 边距
  const EMPTY = 0, BLACK = 1, WHITE = 2;

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const btnRestart = document.getElementById("btnRestart");
  const btnUndo = document.getElementById("btnUndo");

  let board, current, history, gameOver, mode;

  function init() {
    board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY));
    current = BLACK;
    history = [];
    gameOver = false;
    mode = document.querySelector('input[name="mode"]:checked').value;
    setStatus("黑棋先行");
    draw();
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 棋盘线
    ctx.strokeStyle = "#5a3e2b";
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const p = PADDING + i * CELL;
      ctx.beginPath();
      ctx.moveTo(PADDING, p);
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL, p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, PADDING);
      ctx.lineTo(p, PADDING + (BOARD_SIZE - 1) * CELL);
      ctx.stroke();
    }
    // 星位
    [3, 7, 11].forEach((x) =>
      [3, 7, 11].forEach((y) => {
        ctx.beginPath();
        ctx.arc(PADDING + x * CELL, PADDING + y * CELL, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#5a3e2b";
        ctx.fill();
      })
    );
    // 棋子
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== EMPTY) drawStone(r, c, board[r][c]);
      }
    }
  }

  function drawStone(r, c, color) {
    const x = PADDING + c * CELL;
    const y = PADDING + r * CELL;
    const gradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, CELL / 2 - 2);
    if (color === BLACK) {
      gradient.addColorStop(0, "#666");
      gradient.addColorStop(1, "#000");
    } else {
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(1, "#ccc");
    }
    ctx.beginPath();
    ctx.arc(x, y, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = color === BLACK ? "#000" : "#999";
    ctx.stroke();
  }

  function place(r, c) {
    if (gameOver || board[r][c] !== EMPTY) return false;
    board[r][c] = current;
    history.push({ r, c, color: current });
    draw();
    if (checkWin(r, c)) {
      gameOver = true;
      setStatus((current === BLACK ? "黑棋" : "白棋") + "获胜！🎉");
      return true;
    }
    if (history.length === BOARD_SIZE * BOARD_SIZE) {
      gameOver = true;
      setStatus("平局！");
      return true;
    }
    current = current === BLACK ? WHITE : BLACK;
    setStatus("轮到" + (current === BLACK ? "黑棋" : "白棋"));
    return true;
  }

  function checkWin(r, c) {
    const color = board[r][c];
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    return dirs.some(([dr, dc]) => {
      let count = 1;
      count += countDir(r, c, dr, dc, color);
      count += countDir(r, c, -dr, -dc, color);
      return count >= 5;
    });
  }

  function countDir(r, c, dr, dc, color) {
    let n = 0, nr = r + dr, nc = c + dc;
    while (
      nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
      board[nr][nc] === color
    ) {
      n++;
      nr += dr;
      nc += dc;
    }
    return n;
  }

  /* 简单 AI：优先取胜 / 防守，否则选择得分最高的点 */
  function aiMove() {
    const win = findBestLine(WHITE);
    if (win) return win;
    const block = findBestLine(BLACK);
    if (block) return block;
    let best = null, bestScore = -1;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== EMPTY) continue;
        const score = evaluatePoint(r, c, WHITE) + evaluatePoint(r, c, BLACK) * 0.8;
        if (score > bestScore) {
          bestScore = score;
          best = { r, c };
        }
      }
    }
    return best || { r: 7, c: 7 };
  }

  function findBestLine(color) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== EMPTY) continue;
        board[r][c] = color;
        const win = checkWin(r, c);
        board[r][c] = EMPTY;
        if (win) return { r, c };
      }
    }
    return null;
  }

  function evaluatePoint(r, c, color) {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    let score = 0;
    dirs.forEach(([dr, dc]) => {
      const a = countDir(r, c, dr, dc, color);
      const b = countDir(r, c, -dr, -dc, color);
      const len = a + b + 1;
      if (len >= 5) score += 100000;
      else if (len === 4) score += 10000;
      else if (len === 3) score += 1000;
      else if (len === 2) score += 100;
      else score += 10;
    });
    return score;
  }

  canvas.addEventListener("click", (e) => {
    if (gameOver) return;
    if (mode === "pve" && current === WHITE) return; // AI 回合
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const c = Math.round((e.clientX - rect.left) * scale - PADDING) / CELL;
    const r = Math.round((e.clientY - rect.top) * scale - PADDING) / CELL;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    if (!place(Math.round(r), Math.round(c))) return;
    if (!gameOver && mode === "pve") {
      setTimeout(() => {
        const m = aiMove();
        if (m) place(m.r, m.c);
      }, 200);
    }
  });

  btnRestart.addEventListener("click", init);

  btnUndo.addEventListener("click", () => {
    if (!history.length || gameOver) return;
    let steps = mode === "pve" && history.length >= 2 ? 2 : 1;
    while (steps-- > 0 && history.length) {
      const last = history.pop();
      board[last.r][last.c] = EMPTY;
      current = last.color;
    }
    gameOver = false;
    setStatus("轮到" + (current === BLACK ? "黑棋" : "白棋"));
    draw();
  });

  document.querySelectorAll('input[name="mode"]').forEach((el) =>
    el.addEventListener("change", init)
  );

  init();
})();
