const POLISH_ROOT_CLASS = 'crystal-link-game-active';
const POLISH_RIBBON_ID = 'crystal-link-battle-ribbon';
const POLISH_GEM_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
let polishTimer = 0;
let previousSignature = '';
let previousMoveCount = null;

function polishGemType(svg) {
  const hit = (svg.outerHTML || '').match(/grad-(red|blue|green|yellow|purple|orange)/);
  return hit ? POLISH_GEM_NAMES.indexOf(hit[1]) : -1;
}

function polishGemCells() {
  const seen = new Set();
  return [...document.querySelectorAll('svg')].map((svg) => {
    const type = polishGemType(svg);
    const host = svg.closest('button,[role="button"],[tabindex]') || svg.parentElement || svg;
    if (seen.has(host)) return null;
    seen.add(host);
    const rect = host.getBoundingClientRect();
    return { host, type, rect, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }).filter((cell) =>
    cell && cell.type >= 0 && cell.rect.width >= 24 && cell.rect.height >= 24 &&
    cell.rect.bottom > 0 && cell.rect.right > 0 &&
    cell.rect.top < window.innerHeight && cell.rect.left < window.innerWidth
  );
}

function polishReadBoard() {
  const cells = polishGemCells();
  if (cells.length < 64) return null;
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
    .filter((row) => row.cells.length >= 8)
    .sort((a, b) => a.y - b.y)
    .slice(0, 8)
    .map((row) => row.cells.sort((a, b) => a.x - b.x).slice(0, 8));
  if (gridRows.length !== 8 || gridRows.some((row) => row.length !== 8)) return null;
  const grid = gridRows.map((row) => row.map((cell) => cell.type));
  const signature = grid.map((row) => row.join('')).join('|');
  return { grid, signature, cells: gridRows.flat() };
}

function countMatches(grid) {
  const matched = new Set();
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8;) {
      const t = grid[r][c];
      let end = c + 1;
      while (end < 8 && grid[r][end] === t) end += 1;
      if (t >= 0 && end - c >= 3) for (let i = c; i < end; i += 1) matched.add(`${r}:${i}`);
      c = end;
    }
  }
  for (let c = 0; c < 8; c += 1) {
    for (let r = 0; r < 8;) {
      const t = grid[r][c];
      let end = r + 1;
      while (end < 8 && grid[end][c] === t) end += 1;
      if (t >= 0 && end - r >= 3) for (let i = r; i < end; i += 1) matched.add(`${i}:${c}`);
      r = end;
    }
  }
  return matched.size;
}

function moveCount(board) {
  let moves = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      [[r, c + 1], [r + 1, c]].forEach(([rr, cc]) => {
        if (rr >= 8 || cc >= 8) return;
        const grid = board.grid.map((row) => [...row]);
        [grid[r][c], grid[rr][cc]] = [grid[rr][cc], grid[r][c]];
        if (countMatches(grid) > 0) moves += 1;
      });
    }
  }
  return moves;
}

function ribbon() {
  let node = document.getElementById(POLISH_RIBBON_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = POLISH_RIBBON_ID;
    node.className = 'crystal-link-battle-ribbon';
    node.innerHTML = '<span data-kind="state">星盘同步中</span><strong data-kind="moves">--</strong><span data-kind="quality">等待对局</span>';
    document.body.appendChild(node);
  }
  return node;
}

function updateRibbon(board, moves) {
  const node = ribbon();
  node.classList.toggle('is-visible', Boolean(board));
  if (!board) return;
  node.querySelector('[data-kind="state"]').textContent = moves === 0 ? '死局预警' : '星盘稳定';
  node.querySelector('[data-kind="moves"]').textContent = `${moves} 步`;
  node.querySelector('[data-kind="quality"]').textContent = moves >= 12 ? '选择充足' : moves >= 5 ? '局面正常' : '空间偏窄';
}

function markBoardContainer(cells) {
  document.querySelectorAll('.crystal-link-board-shell').forEach((node) => node.classList.remove('crystal-link-board-shell'));
  const hosts = cells.map((cell) => cell.host);
  const candidates = hosts.map((host) => host.parentElement).filter(Boolean);
  const board = candidates.find((candidate) => candidate.children.length >= 48) || candidates[0]?.parentElement;
  if (board) board.classList.add('crystal-link-board-shell');
}

function animateBoardChange(signature) {
  if (!previousSignature || previousSignature === signature) return;
  const node = ribbon();
  node.classList.add('is-pulsing');
  window.setTimeout(() => node.classList.remove('is-pulsing'), 360);
}

function scanPolish() {
  clearTimeout(polishTimer);
  polishTimer = setTimeout(() => {
    const board = polishReadBoard();
    document.body.classList.toggle(POLISH_ROOT_CLASS, Boolean(board));
    if (!board) {
      updateRibbon(null, 0);
      return;
    }
    const moves = moveCount(board);
    markBoardContainer(board.cells);
    updateRibbon(board, moves);
    animateBoardChange(board.signature);
    previousSignature = board.signature;
    previousMoveCount = moves;
  }, 180);
}

function bootPolish() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  ribbon();
  const root = document.getElementById('root') || document.body;
  new MutationObserver(scanPolish).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', scanPolish, { passive: true });
  window.setInterval(scanPolish, 1600);
  scanPolish();
}

bootPolish();
