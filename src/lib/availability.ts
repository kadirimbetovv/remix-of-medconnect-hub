export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export const BLOCKS_PER_DAY = 48; // 30-minute blocks

export type LegacySlot = { start: string; end: string; busy: boolean };
export type LegacyAvailability = Record<Day, LegacySlot>;
export type BlocksAvailability = Record<Day, boolean[]>; // true = available

export type AvailabilityShape = {
  blocks?: BlocksAvailability;
  legacy?: LegacyAvailability;
};

export function emptyBlocks(): BlocksAvailability {
  return DAYS.reduce((acc, d) => {
    acc[d] = new Array(BLOCKS_PER_DAY).fill(false);
    return acc;
  }, {} as BlocksAvailability);
}

/** Convert any legacy availability (start/end+busy) into a 30-min blocks grid. */
export function legacyToBlocks(legacy: LegacyAvailability | undefined): BlocksAvailability {
  const blocks = emptyBlocks();
  if (!legacy) return blocks;
  for (const d of DAYS) {
    const slot = legacy[d];
    if (!slot || slot.busy) continue;
    const [sh, sm] = (slot.start || "09:00").split(":").map(Number);
    const [eh, em] = (slot.end || "17:00").split(":").map(Number);
    const startIdx = Math.floor((sh * 60 + sm) / 30);
    const endIdx = Math.floor((eh * 60 + em) / 30);
    for (let i = startIdx; i < endIdx && i < BLOCKS_PER_DAY; i++) blocks[d][i] = true;
  }
  return blocks;
}

/** Read availability from a profile resume in either format. */
export function readBlocks(input: unknown): BlocksAvailability {
  const r = (input ?? {}) as { availability?: unknown; availability_blocks?: unknown };
  const ab = r.availability_blocks as BlocksAvailability | undefined;
  if (ab && DAYS.every((d) => Array.isArray(ab[d]) && ab[d].length === BLOCKS_PER_DAY)) {
    return DAYS.reduce((acc, d) => { acc[d] = ab[d].map(Boolean); return acc; }, {} as BlocksAvailability);
  }
  // fall back to legacy start/end
  return legacyToBlocks(r.availability as LegacyAvailability | undefined);
}

export function blockIndexToTime(i: number): string {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}