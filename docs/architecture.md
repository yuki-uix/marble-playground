# Architecture and agent context

## Stable specification

Goal: a playful Three.js interaction loop, not a full game-generation platform. One board, three pieces, one marble, one goal. The user chooses a tool, places/rotates parts, runs a simulation and edits again. The 3D camera is fixed so touch and desktop interactions map to the same planar coordinate system.

## State ownership

- Layout: array of `{slot, kind, angle}`, owned by React. Editing is disabled during a run.
- Simulation: a ball state with position, velocity, time, collision count and terminal status. `step()` returns a new state and never changes the layout.
- Presentation: meshes, trail, camera and particles owned by the scene adapter. They do not decide whether the user won.
- UI: chosen tool, selected slot, attempt count, audio preference and editing/running/won/lost phase.

Units are game units; +Y is up, gravity points down. Physics runs at 1/120 s. The animation loop caps accumulated frame time, pauses while the document is hidden, and prevents background-tab time from jumping the ball ahead. This favors stable play over wall-clock timing.

Each run starts at (-3, 9.1). A win requires crossing the target opening downward with the marble center inside its width minus the marble radius. Touching the general vicinity of the cup does not count. Unsuccessful runs stop below the board or after 18 simulation seconds. Reset creates a fresh run; no browser persistence is required.

## Collision scope

Ramps and bumpers are capsule line segments. Spring bumpers are circles. Restitution differs by type; springs add a bounded outward kick per approaching collision. Small fixed steps reduce tunneling but this is not a continuous collision engine. The supported board and normal user-generated trajectories are the intended scope.

## Useful context for future agent work

Start with README, this document, the current git diff, and the failing behavior. For physics changes, use a concrete layout array and `simulate()` result. For interaction/visual changes, collect actual browser observations and a reproduction sequence. Never infer browser correctness from a passing physics test.

Keep the current layout and simulation evidence separate from prose summaries. Record meaningful revisions and human intervention in `experiments/`, rather than attempting to save the entire chat as project state.
