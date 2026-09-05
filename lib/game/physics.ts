export type Kind = 'ramp' | 'bumper' | 'spring';
export type Piece = { slot: number; kind: Kind; angle: number };
export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  hits: number;
  collected: boolean;
  status: 'running' | 'won' | 'lost';
};
export const RADIUS = 0.19;
export const STEP = 1 / 120;
export const TARGET = { x: 2.8, y: 0.65, width: 1.5 };
export const SLOTS = Array.from({ length: 16 }, (_, i) => ({
  x: -3 + (i % 4) * 2,
  y: 7.6 - Math.floor(i / 4) * 1.8,
}));
export type Board = {
  start: { x: number; y: number };
  target: typeof TARGET;
  fixed: Piece[];
  star?: { x: number; y: number };
};
export const DEFAULT_BOARD: Board = {
  start: { x: -3, y: 9.1 },
  target: TARGET,
  fixed: [],
};
export const initialBall = (board: Board = DEFAULT_BOARD): Ball => ({
  x: board.start.x,
  y: board.start.y,
  vx: 0,
  vy: 0,
  time: 0,
  hits: 0,
  collected: false,
  status: 'running',
});
export function step(
  ball: Ball,
  pieces: readonly Piece[],
  dt = STEP,
  board: Board = DEFAULT_BOARD,
): Ball {
  if (ball.status !== 'running') return ball;
  const b = { ...ball, time: ball.time + dt };
  b.vy -= 7 * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  for (const piece of [...board.fixed, ...pieces]) {
    const s = SLOTS[piece.slot];
    if (!s) continue;
    let nx: number, ny: number, penetration: number;
    if (piece.kind === 'spring') {
      const dx = b.x - s.x,
        dy = b.y - s.y,
        d = Math.hypot(dx, dy);
      penetration = 0.42 + RADIUS - d;
      nx = d > 0.0001 ? dx / d : 0;
      ny = d > 0.0001 ? dy / d : 1;
    } else {
      const a = (piece.angle * Math.PI) / 180,
        tx = Math.cos(a),
        ty = Math.sin(a);
      const along = Math.max(
        -0.88,
        Math.min(0.88, (b.x - s.x) * tx + (b.y - s.y) * ty),
      );
      const dx = b.x - (s.x + along * tx),
        dy = b.y - (s.y + along * ty),
        d = Math.hypot(dx, dy);
      penetration = RADIUS + 0.1 - d;
      nx = d > 0.0001 ? dx / d : -ty;
      ny = d > 0.0001 ? dy / d : tx;
    }
    if (penetration > 0) {
      b.x += nx * penetration;
      b.y += ny * penetration;
      const normalSpeed = b.vx * nx + b.vy * ny;
      if (normalSpeed < 0) {
        const restitution =
          piece.kind === 'spring' ? 1.2 : piece.kind === 'bumper' ? 0.72 : 0.12;
        b.vx -= (1 + restitution) * normalSpeed * nx;
        b.vy -= (1 + restitution) * normalSpeed * ny;
        if (normalSpeed < -0.4) b.hits++;
        if (piece.kind === 'spring' && normalSpeed < -0.4) {
          b.vx += nx * 1.6;
          b.vy += ny * 1.6;
        }
      }
    }
  }
  if (b.x < -4.45 + RADIUS) {
    b.x = -4.45 + RADIUS;
    b.vx = Math.abs(b.vx) * 0.6;
  }
  if (b.x > 4.45 - RADIUS) {
    b.x = 4.45 - RADIUS;
    b.vx = -Math.abs(b.vx) * 0.6;
  }
  if (b.y > 10) {
    b.y = 10;
    b.vy = -Math.abs(b.vy) * 0.5;
  }
  if (board.star && Math.hypot(b.x - board.star.x, b.y - board.star.y) < 0.42)
    b.collected = true;
  const target = board.target;
  // Only a downward crossing through the cup opening counts as a win.
  if (
    ball.y >= target.y &&
    b.y < target.y &&
    b.vy < 0 &&
    Math.abs(b.x - target.x) < target.width / 2 - RADIUS
  )
    b.status = 'won';
  else if (b.y < -0.35 || b.time > 18) b.status = 'lost';
  return b;
}
export function simulate(
  pieces: readonly Piece[],
  board: Board = DEFAULT_BOARD,
): Ball {
  let b = initialBall(board);
  while (b.status === 'running') b = step(b, pieces, STEP, board);
  return b;
}
