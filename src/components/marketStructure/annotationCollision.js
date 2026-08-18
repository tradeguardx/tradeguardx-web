/**
 * Label collision management (§39, mandatory). Pure geometry — takes label
 * bounding boxes with a priority, returns a resized/repositioned/hidden
 * verdict per box. Order of resolution: reposition first (small vertical
 * nudge), then hide as a last resort — never silently overlap.
 */

const NUDGE_STEP = 14; // px, roughly one label row
const MAX_NUDGES = 4;

function overlaps(a, b) {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

/**
 * @param {Array<{id:string,x:number,y:number,width:number,height:number,priority:number}>} boxes
 * @returns {Map<string,{x:number,y:number,visible:boolean}>}
 */
export function resolveLabelCollisions(boxes) {
  const sorted = [...boxes].sort((a, b) => b.priority - a.priority);
  const placed = [];
  const result = new Map();

  for (const box of sorted) {
    let candidate = box;
    let attempt = 0;
    let clear = !placed.some((p) => overlaps(candidate, p));

    while (!clear && attempt < MAX_NUDGES) {
      attempt++;
      const direction = attempt % 2 === 0 ? 1 : -1;
      const magnitude = Math.ceil(attempt / 2);
      candidate = { ...box, y: box.y + direction * NUDGE_STEP * magnitude };
      clear = !placed.some((p) => overlaps(candidate, p));
    }

    if (clear) {
      placed.push(candidate);
      result.set(box.id, { x: candidate.x, y: candidate.y, visible: true });
    } else {
      // Every nudge still collides — this is the lowest-priority label in
      // the conflict (we process highest-priority first), so it yields.
      result.set(box.id, { x: box.x, y: box.y, visible: false });
    }
  }

  return result;
}
