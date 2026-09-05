import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, canPlace, bonusAchieved } from '../lib/game/levels.ts';
import { simulate } from '../lib/game/physics.ts';
for (const level of LEVELS) {
  test(`${level.id}: supplied solution wins with real physics`, () => {
    const b = simulate(level.solution, level);
    assert.equal(b.status, 'won');
    if (level.id !== 'free')
      assert.equal(bonusAchieved(level, level.solution, b.collected), true);
  });
  test(`${level.id}: empty board cannot win`, () =>
    assert.equal(simulate([], level).status, 'lost'));
}
test('fixed obstacle cannot be replaced', () =>
  assert.equal(canPlace(LEVELS[1], [], 4, 'bumper'), false));
test('unavailable tools and over-budget placements are rejected', () => {
  assert.equal(canPlace(LEVELS[0], [], 0, 'spring'), false);
  assert.equal(
    canPlace(
      LEVELS[0],
      [
        { slot: 0, kind: 'ramp', angle: 0 },
        { slot: 1, kind: 'ramp', angle: 0 },
        { slot: 2, kind: 'ramp', angle: 0 },
      ],
      3,
      'ramp',
    ),
    false,
  );
});
test('a regular ramp cannot substitute for spring in the height puzzle', () =>
  assert.equal(
    simulate([{ slot: 0, kind: 'ramp', angle: 0 }], LEVELS[2]).status,
    'lost',
  ));
test('level completion is separate from optional bonus', () => {
  assert.equal(
    bonusAchieved(
      LEVELS[0],
      [
        { slot: 0, kind: 'ramp', angle: 0 },
        { slot: 1, kind: 'ramp', angle: 0 },
      ],
      false,
    ),
    false,
  );
  assert.equal(bonusAchieved(LEVELS[2], [], false), false);
});
