const BOARD_SIZE = 8;
const HUD_ID = 'crystal-link-hud';
const COACH_ID = 'crystal-link-gameplay-coach';
const GEM_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
let scanTimer = 0;
let hintTimer = 0;
let lastDeadlock = '';

function showHud(message, ms = 1600) {
  let hud = document.getElementById(HUD_ID);
  if (!hud) {
    hud = document.createElement('div');
    hud.id = HUD_ID;
    hud.className = 'crystal-link-hud';
    document.body.appendChild(hud);
  }
  hud.textContent = message;
  hud.classList.add('is-visible');
  clearTimeout(showHud.timer);
  showHud.timer = setTimeout(() => hud.classList.remove('is-visible'), ms);
}

function getType(button) {
  const hit = (button.innerHTML || '').match(/grad-(red|blue|green|yellow|purple|orange)/);
  return hit ? GEM_NAMES.indexOf(hit[1]) : -1;
}

function visibleGemCells() {
  return [...document.querySelectorAll('button')].map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      button,
      rect,
      type: getType(button),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }).filter((cell) =>
    cell.type >= 0 && cell.rect.width >= 24 && cell.rect.height >= 24 &&
    cell.rect.bottom > 0 && cell.rect.right > 0 &&
    cell.rect.top < innerHeight && cell.rect.left < innerWidth
  );
}

function readBoard() {
  const cells = visibleGemCells();
  if (cells.length < BOARD_SIZE * BOARD_SIZE) return null;

  const rows = [];
  cells.sort((a, b) => a.y - b.y || a.x - b.x).forEach((cell) => {
    const row = rows.find((candidate) => Math.abs(candidate.y - cell.y) < Math.max(12, cell.rect.height * 0.45));
    if (row) {
      row.cells.push(cell);
      row.y = row.cells.reduce((sum, item) => sum + item.y, 0) / row.cells.length;
    } else {
      rows.push({ y: cell.y, cells: [cell] });
    }
  });

  const gridRows = rows
    .filter((row) => row.cells.length >= BOARD_SIZE)
    .sort((a, b) => a.y - b.y)
    .slice(0, BOARD_SIZE)
    .map((row) => row.cells.sort((a, b) => a.x - b.x).slice(0, BOARD_SIZE));

  if (gridRows.length !== BOARD_SIZE || gridRows.some((row) => row.length !== BOARD_SIZE)) return null;

  const grid = gridRows.map((row, r) => row.map((cell, c) => ({ ...cell, r, c })));
  return { grid, signature: grid.map((row) => row.map((cell) => cell.type).join('')).join('|') };
}

function typeGrid(board) {
  return board.grid.map((row) => row.map((cell) => cell.type));
}

function countMatches(grid) {
  const matched = new Set();
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE;) {
      const t = grid[r][c];
      let end = c + 1;
      while (end < BOARD_SIZE && grid[r][end] === t) end += 1;
      if (t >= 0 && end - c >= 3) for (let i = c; i < end; i += 1) matched.add(`${r}:${i}`);
      c = end;
    }
  }
  for (let c = 0; c < BOARD_SIZE; c += 1) {
    for (let r = 0; r < BOARD_SIZE;) {
      const t = grid[r][c];
      let end = r + 1;
      while (end < BOARD_SIZE && grid[end][c] === t) end += 1;
      if (t >= 0 && end - r >= 3) for (let i = r; i < end; i += 1) matched.add(`${i}:${c}`);
      r = end;
    }
  }
  return matched.size;
}

function scoreSwap(board, a, b) {
  const grid = typeGrid(board);
  [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
  const matches = countMatches(grid);
  if (!matches) return 0;
  const centerBonus = 8 - Math.abs(3.5 - b.r) - Math.abs(3.5 - b.c);
  return matches * 10 + (matches >= 4 ? 25 : 0) + centerBonus;
}

function findMoves(board) {
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const current = board.grid[r][c];
      [board.grid[r]?.[c + 1], board.grid[r + 1]?.[c]].filter(Boolean).forEach((target) => {
        const score = scoreSwap(board, current, target);
        if (score > 0) moves.push({ first: current, second: target, score });
      });
    }
  }
  return moves.sort((a, b) => b.score - a.score);
}

function clearHint() {
  clearTimeout(hintTimer);
  document.querySelectorAll('.crystal-link-hint-cell,.crystal-link-hint-primary').forEach((node) => {
    node.classList.remove('crystal-link-hint-cell', 'crystal-link-hint-primary');
  });
}

function showBestMove() {
  const board = readBoard();
  if (!board) return showHud('进入关卡后才能分析棋盘');
  const moves = findMoves(board);
  if (!moves.length) {
    lastDeadlock = board.signature;
    return showHud('当前棋盘无有效交换，建议使用洗牌道具', 2300);
  }
  clearHint();
  moves[0].first.button.classList.add('crystal-link-hint-cell', 'crystal-link-hint-primary');
  moves[0].second.button.classList.add('crystal-link-hint-cell');
  hintTimer = setTimeout(clearHint, 2400);
  showHud(`推荐走法已标出，约有 ${moves.length} 个可行交换`, 1900);
}

function coachButton() {
  let button = document.getElementById(COACH_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = COACH_ID;
    button.type = 'button';
    button.dataset.safeClick = 'off';
    button.className = 'crystal-link-coach';
    button.innerHTML = '<span>智能提示</span><strong>?</strong>';
    button.addEventListener('click', showBestMove);
    document.body.appendChild(button);
  }
  return button;
}

function analyzeSoon() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    const board = readBoard();
    coachButton().classList.toggle('is-visible', Boolean(board));
    if (!board) return clearHint();
    const moves = findMoves(board);
    if (!moves.length && lastDeadlock !== board.signature) {
      lastDeadlock = board.signature;
      showHud('检测到死局：没有可消除交换，建议洗牌', 2400);
    }
  }, 320);
}

function boot() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  coachButton();
  const root = document.getElementById('root') || document.body;
  new MutationObserver(analyzeSoon).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  document.addEventListener('keydown', (event) => {
    if (event.key === '?' && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showBestMove();
    }
  }, true);
  addEventListener('resize', analyzeSoon, { passive: true });
  setInterval(analyzeSoon, 1800);
  analyzeSoon();
}

boot();
