# Puzzle iteration · 2026-09-05

The user found the sandbox insufficiently playable. This version adds three short puzzles (ramp turn, bounce around a fixed obstacle, spring upward), retains the free-build board, and adds undo, previous-run dashed trails, directional rotation, hints and session-local completion marks.

Each puzzle provides up to three pieces. The first two offer a one-piece optional challenge; the third offers an optional airborne collectible. All puzzles are selectable without artificial gating. Reference solutions were verified using production physics, and empty layouts were checked not to win. The spring puzzle additionally verifies that a passive ramp cannot replace the spring.

Validation: 21 automated physics/level tests, TypeScript check and production build. Browser interaction/visual testing has not been performed. Completion marks are session-local; selecting another level starts with an empty layout. Undo applies to placements, rotations, deletions and clearing, and never rewinds the physical simulation. Previous-run trajectories remain visible during editing and clear when changing boards.
