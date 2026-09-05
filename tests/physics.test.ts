import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialBall,
  step,
  simulate,
  STEP,
  type Piece,
} from '../lib/game/physics.ts';
const solution: Piece[] = [
  { slot: 4, kind: 'ramp', angle: -75 },
  { slot: 9, kind: 'ramp', angle: -15 },
  { slot: 10, kind: 'ramp', angle: -45 },
];
test('a real route reaches the cup through production physics', () =>
  assert.equal(simulate(solution).status, 'won'));
test('an empty board misses the cup', () =>
  assert.equal(simulate([]).status, 'lost'));
test('retry produces identical results without mutating the layout', () => {
  const before = JSON.stringify(solution);
  assert.deepEqual(simulate(solution), simulate(solution));
  assert.equal(JSON.stringify(solution), before);
});
test('crossing the goal upward does not win', () => {
  const b = { ...initialBall(), x: 2.8, y: 0.63, vy: 5 };
  assert.equal(step(b, []).status, 'running');
});
test('being outside the goal at the crossing does not win', () => {
  const b = { ...initialBall(), x: 1.8, y: 0.66, vy: -5 };
  assert.equal(step(b, []).status, 'running');
});
test('timeout ends trapped trajectories', () =>
  assert.equal(step({ ...initialBall(), time: 18 }, []).status, 'lost'));
test('completed runs cannot keep advancing', () => {
  const b = simulate(solution);
  assert.equal(step(b, solution), b);
});
test('spring collision adds outward motion', () => {
  const b = { ...initialBall(), x: -3, y: 8.19, vy: -2 };
  const result = step(b, [{ slot: 0, kind: 'spring', angle: 0 }], STEP);
  assert.ok(result.vy > 2);
  assert.equal(result.hits, 1);
});
test('side walls keep the ball inside the board', () => {
  const result = step({ ...initialBall(), x: 4.25, vx: 10 }, []);
  assert.ok(result.x <= 4.26);
  assert.ok(result.vx < 0);
});
