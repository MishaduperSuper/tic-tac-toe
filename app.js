const boardEl = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");
const swapBtn = document.getElementById("swap");
const difficultyEl = document.getElementById("difficulty");
const scorePlayerEl = document.getElementById("score-player");
const scoreAiEl = document.getElementById("score-ai");
const scoreDrawEl = document.getElementById("score-draw");
const scorePlayerLabel = document.getElementById("score-player-label");
const scoreAiLabel = document.getElementById("score-ai-label");

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

let board = Array(9).fill(null);
let player = "X";
let ai = "O";
let gameOver = false;
const score = {
  player: 0,
  ai: 0,
  draw: 0
};

function updateStatus(message, className) {
  statusEl.textContent = message;
  statusEl.classList.remove("winner", "loser");
  if (className) statusEl.classList.add(className);
}

function updateScore() {
  scorePlayerEl.textContent = String(score.player);
  scoreAiEl.textContent = String(score.ai);
  scoreDrawEl.textContent = String(score.draw);
  scorePlayerLabel.textContent = "Вы (" + player + ")";
  scoreAiLabel.textContent = "ИИ (" + ai + ")";
}

function checkWinner(state) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return state[a];
    }
  }
  return state.every(Boolean) ? "draw" : null;
}

function availableMoves(state) {
  return state
    .map((value, index) => (value ? null : index))
    .filter((value) => value !== null);
}

function pickMove(state) {
  const difficulty = difficultyEl.value;
  const moves = availableMoves(state);
  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (difficulty === "medium" && Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return bestMove(state, ai).index;
}

function bestMove(state, current) {
  const winner = checkWinner(state);
  if (winner === ai) return { score: 10 };
  if (winner === player) return { score: -10 };
  if (winner === "draw") return { score: 0 };

  const moves = [];
  for (const index of availableMoves(state)) {
    const next = state.slice();
    next[index] = current;
    const result = bestMove(next, current === ai ? player : ai);
    moves.push({ index, score: result.score });
  }

  let best = null;
  if (current === ai) {
    best = moves.reduce((max, move) => (move.score > max.score ? move : max));
  } else {
    best = moves.reduce((min, move) => (move.score < min.score ? move : min));
  }
  return best;
}

function render() {
  cells.forEach((cell, index) => {
    const value = board[index];
    cell.textContent = value || "";
    cell.classList.toggle("x", value === "X");
    cell.classList.toggle("o", value === "O");
    cell.classList.toggle("disabled", gameOver || value !== null);
  });
}

function endGame(result) {
  gameOver = true;
  if (result === "draw") {
    score.draw += 1;
    updateStatus("Ничья!", null);
  } else if (result === player) {
    score.player += 1;
    updateStatus("Вы победили!", "winner");
  } else {
    score.ai += 1;
    updateStatus("ИИ победил!", "loser");
  }
  updateScore();
  boardEl.classList.add("pulse");
  setTimeout(() => boardEl.classList.remove("pulse"), 600);
}

function aiTurn() {
  if (gameOver) return;
  const move = pickMove(board);
  if (move === undefined) return;
  board[move] = ai;
  const winner = checkWinner(board);
  render();
  if (winner) {
    endGame(winner);
  } else {
    updateStatus("Ваш ход: " + player, null);
  }
}

function handlePlayerMove(index) {
  if (gameOver || board[index]) return;
  board[index] = player;
  const winner = checkWinner(board);
  render();
  if (winner) {
    endGame(winner);
    return;
  }
  updateStatus("Ход ИИ…", null);
  setTimeout(aiTurn, 350);
}

function resetGame() {
  board = Array(9).fill(null);
  gameOver = false;
  render();
  updateStatus("Ваш ход: " + player, null);
  if (player === "O") {
    updateStatus("Ход ИИ…", null);
    setTimeout(aiTurn, 350);
  }
}

function applyTelegramTheme() {
  if (!tg) return;
  const params = tg.themeParams || {};
  const root = document.documentElement;
  const body = document.body;
  if (params.bg_color) {
    root.style.setProperty("--bg", params.bg_color);
    body.classList.add("tg-theme");
  }
  if (params.secondary_bg_color) {
    root.style.setProperty("--panel", params.secondary_bg_color);
  }
  if (params.text_color) {
    root.style.setProperty("--ink", params.text_color);
  }
  if (params.hint_color) {
    root.style.setProperty("--grid", params.hint_color);
    root.style.setProperty("--border", params.hint_color);
  }
  if (params.button_color) {
    root.style.setProperty("--accent", params.button_color);
    root.style.setProperty("--accent-2", params.button_color);
  }
  if (params.section_bg_color) {
    root.style.setProperty("--surface", params.section_bg_color);
    root.style.setProperty("--surface-2", params.section_bg_color);
  }
}

function setupTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  applyTelegramTheme();
  tg.onEvent("themeChanged", applyTelegramTheme);
  if (tg.MainButton) {
    tg.MainButton.setText("Новая игра");
    tg.MainButton.onClick(resetGame);
    tg.MainButton.show();
  }
}

cells.forEach((cell) => {
  cell.addEventListener("click", () => handlePlayerMove(Number(cell.dataset.index)));
});

resetBtn.addEventListener("click", resetGame);

swapBtn.addEventListener("click", () => {
  [player, ai] = [ai, player];
  swapBtn.textContent = "Играть за " + (player === "X" ? "O" : "X");
  updateScore();
  resetGame();
});

setupTelegram();
updateScore();
resetGame();
