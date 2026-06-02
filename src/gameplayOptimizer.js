const BOARD_SIZE = 8;
const HUD_ID = 'crystal-link-hud';
const COACH_ID = 'crystal-link-gameplay-coach';
const PANEL_ID = 'crystal-link-strategy-panel';
const GEM_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
let scanTimer = 0;
let hintTimer = 0;
let lastDeadlock = '';
let latestAnalysis = { board: null, moves: [] };
let panelPinnedClosed = false;

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

function getType(element) {
  const html = element?.outerHTML || element?.innerHTML || '';
  const hit = html.match(/grad-(red|blue|green|yellow|purple|orange)/);
  return hit ? GEM_NAMES.indexOf(hit[1]) : -1;
}

function cellHost(svg) {
  return svg.closest('button,[role="button"],[tabindex]') || svg.parentElement || svg;
}

function visibleGemCells() {
  const seen = new Set();
  return [...document.querySelectorAll('svg')].map((svg) => {
    const type = getType(svg);
    const host = cellHost(svg);
    if (seen.has(host)) return null;
    seen.add(host);
    const hostRect = host.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const rect = hostRect.width >= 24 && hostRect.height >= 24 ? hostRect : svgRect;
    return { element: host, rect, type, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }).filter((cell) =>
    cell && cell.type >= 0 && cell.rect.width >= 24 && cell.rect.height >= 24 &&
    cell.rect.bottom > 0 && cell.rect.right > 0 &&
    cell.rect.top < window.innerHeight && cell.rect.left < window.innerWidth
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
  return Math.round(matches * 10 + (matches >= 4 ? 25 : 0) + centerBonus);
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

function highlightMove(move) {
  clearHint();
  move.first.element.classList.add('crystal-link-hint-cell', 'crystal-link-hint-primary');
  move.second.element.classList.add('crystal-link-hint-cell');
  hintTimer = setTimeout(clearHint, 2600);
}

function showBestMove() {
  const board = readBoard();
  if (!board) return showHud('正在识别棋盘；请确认已进入 8×8 对局画面', 2200);
  const moves = findMoves(board);
  latestAnalysis = { board, moves };
  panelPinnedClosed = false;
  updatePanel(board, moves);
  if (!moves.length) {
    lastDeadlock = board.signature;
    return showHud('当前棋盘无有效交换，可用救场洗牌', 2300);
  }
  highlightMove(moves[0]);
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
    button.innerHTML = '<span>星盘面板</span><strong>↗</strong>';
    button.addEventListener('click', togglePanel);
    document.body.appendChild(button);
  }
  return button;
}

function panel() {
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = document.createElement('aside');
    node.id = PANEL_ID;
    node.className = 'crystal-link-strategy-panel';
    node.innerHTML = `
      <div class="strategy-title"><span>星盘分析</span><button data-action="collapse" type="button">×</button></div>
      <div class="strategy-grid">
        <div><small>可行交换</small><strong data-stat="moves">--</strong></div>
        <div><small>最佳收益</small><strong data-stat="best">--</strong></div>
      </div>
      <p data-stat="status">等待棋盘稳定...</p>
      <div class="strategy-actions">
        <button data-action="hint" type="button">标出推荐</button>
        <button data-action="shuffle" type="button">救场洗牌</button>
      </div>`;
    node.querySelector('[data-action="hint"]').addEventListener('click', showBestMove);
    node.querySelector('[data-action="shuffle"]').addEventListener('click', rescueShuffle);
    node.querySelector('[data-action="collapse"]').addEventListener('click', () => {
      panelPinnedClosed = true;
      node.classList.remove('is-visible');
    });
    document.body.appendChild(node);
  }
  return node;
}

function togglePanel() {
  const node = panel();
  panelPinnedClosed = node.classList.contains('is-visible');
  node.classList.toggle('is-visible');
  const button = coachButton();
  button.querySelector('span').textContent = node.classList.contains('is-visible') ? '收起面板' : '星盘面板';
}

function updatePanel(board, moves) {
  const node = panel();
  const shouldShow = (Boolean(board) || looksLikeGameScreen()) && !panelPinnedClosed;
  node.classList.toggle('is-visible', shouldShow);
  const button = coachButton();
  button.querySelector('span').textContent = node.classList.contains('is-visible') ? '收起面板' : '星盘面板';
  node.querySelector('[data-stat="moves"]').textContent = board ? String(moves.length) : '--';
  node.querySelector('[data-stat="best"]').textContent = moves[0] ? String(moves[0].score) : '--';
  const status = node.querySelector('[data-stat="status"]');
  const shuffle = node.querySelector('[data-action="shuffle"]');
  if (!board) {
    status.textContent = '正在等待 8×8 棋盘渲染完成。';
    shuffle.disabled = true;
  } else if (!moves.length) {
    status.textContent = '检测到死局。建议洗牌，不建议继续尝试随机交换。';
    shuffle.disabled = false;
  } else if (moves[0].score >= 65) {
    status.textContent = '存在高价值走法，优先触发 4 连或更大消除。';
    shuffle.disabled = true;
  } else {
    status.textContent = '棋盘正常。建议选择收益最高的相邻交换。';
    shuffle.disabled = true;
  }
}

function findShuffleButton() {
  const icon = document.querySelector('svg.lucide-dices, svg[class*="dices"], svg[class*="Dices"]');
  return icon?.closest('button') || null;
}

function rescueShuffle() {
  const button = findShuffleButton();
  if (!button || button.disabled) {
    showHud('未找到可用洗牌按钮，请手动使用右下道具', 2200);
    return;
  }
  button.click();
  showHud('已触发洗牌道具，等待棋盘重构', 1800);
}

function looksLikeGameScreen() {
  const text = document.body?.innerText || '';
  return text.includes('MOVES') || text.includes('LV.') || visibleGemCells().length >= 16;
}

function analyzeSoon() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    const board = readBoard();
    const moves = board ? findMoves(board) : [];
    latestAnalysis = { board, moves };
    const visible = Boolean(board) || looksLikeGameScreen();
    coachButton().classList.toggle('is-visible', visible);
    updatePanel(board, moves);
    if (!visible) panelPinnedClosed = false;
    if (!board) return clearHint();
    if (!moves.length && lastDeadlock !== board.signature) {
      lastDeadlock = board.signature;
      panelPinnedClosed = false;
      updatePanel(board, moves);
      showHud('检测到死局：可点面板里的救场洗牌', 2400);
    }
  }, 320);
}

function boot() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  coachButton();
  panel();
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
  setInterval(analyzeSoon, 1200);
  analyzeSoon();
}

boot();
