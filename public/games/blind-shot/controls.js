import {moveArena} from './arena.js';
// Camera-relative walking on the existing server x/y plane.
export function walkDraft(draft, arena, forward, right, seconds) {
  const magnitude = Math.hypot(forward, right);
  if (!magnitude) return {...draft};
  const speed = 130 * Math.min(.05, Math.max(0, seconds)) / Math.max(1, magnitude);
  let x = draft.x + (Math.cos(draft.angle) * forward - Math.sin(draft.angle) * right) * speed;
  let y = draft.y + (Math.sin(draft.angle) * forward + Math.cos(draft.angle) * right) * speed;
  ({x, y} = moveArena(draft, x, y, arena));
  return {...draft, x, y};
}
