const POLISH_ROOT_CLASS = 'crystal-link-game-active';
const POLISH_GEM_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
let polishTimer = 0;
let previousSignature = '';

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

  const signature = gridRows.map((row) => row.map((cell) => cell.type).join('')).join('|');
  return { signature, cells: gridRows.flat() };
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
  document.body.classList.add('crystal-link-board-changed');
  window.setTimeout(() => document.body.classList.remove('crystal-link-board-changed'), 360);
}

function scanPolish() {
  clearTimeout(polishTimer);
  polishTimer = setTimeout(() => {
    const board = polishReadBoard();
    document.body.classList.toggle(POLISH_ROOT_CLASS, Boolean(board));
    if (!board) return;

    markBoardContainer(board.cells);
    animateBoardChange(board.signature);
    previousSignature = board.signature;
  }, 180);
}

function bootPolish() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.getElementById('root') || document.body;
  new MutationObserver(scanPolish).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', scanPolish, { passive: true });
  window.setInterval(scanPolish, 1600);
  scanPolish();
}

bootPolish();
