import { 
  Coord, 
  PlacedShip, 
  ShotRecord, 
  FLEET_CONFIG, 
  GRID_COLS, 
  GRID_ROWS,
  ShipDefinition 
} from '../types/battleship';

/**
 * Checks if a ship placement is legally within 7x9 bounds and does not collide with existing ships
 */
export function canPlaceShip(
  existingShips: PlacedShip[],
  size: number,
  startR: number,
  startC: number,
  isVertical: boolean,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS
): boolean {
  const positions: Coord[] = [];
  for (let i = 0; i < size; i++) {
    const r = isVertical ? startR + i : startR;
    const c = isVertical ? startC : startC + i;

    // Out of bounds check
    if (r < 0 || r >= rows || c < 0 || c >= cols) {
      return false;
    }
    positions.push({ r, c });
  }

  // Check collision with existing ships
  for (const ship of existingShips) {
    for (const pos of ship.positions) {
      if (positions.some((p) => p.r === pos.r && p.c === pos.c)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Generates ship coordinates array
 */
export function getShipCoordinates(
  startR: number,
  startC: number,
  size: number,
  isVertical: boolean
): Coord[] {
  const coords: Coord[] = [];
  for (let i = 0; i < size; i++) {
    coords.push({
      r: isVertical ? startR + i : startR,
      c: isVertical ? startC : startC + i,
    });
  }
  return coords;
}

/**
 * Generates an automatic randomized valid fleet of 5 ships
 */
export function generateRandomFleet(
  fleet: ShipDefinition[] = FLEET_CONFIG,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS
): PlacedShip[] {
  const placed: PlacedShip[] = [];

  for (const def of fleet) {
    let success = false;
    let attempts = 0;

    while (!success && attempts < 200) {
      attempts++;
      const isVertical = Math.random() < 0.5;
      const maxR = isVertical ? rows - def.size : rows - 1;
      const maxC = isVertical ? cols - 1 : cols - def.size;

      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));

      if (canPlaceShip(placed, def.size, r, c, isVertical, cols, rows)) {
        placed.push({
          id: `${def.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          name: def.name,
          size: def.size,
          icon: def.icon,
          positions: getShipCoordinates(r, c, def.size, isVertical),
          isVertical,
          hits: 0,
          sunk: false,
        });
        success = true;
      }
    }
  }

  return placed;
}

/**
 * Resolves a fired shot against a player's fleet
 */
export function processShot(
  ships: PlacedShip[],
  existingShots: ShotRecord[],
  r: number,
  c: number
): {
  updatedShips: PlacedShip[];
  updatedShots: ShotRecord[];
  isHit: boolean;
  sunkShipName?: string;
  allSunk: boolean;
} {
  // Check if cell was already targeted
  if (existingShots.some((s) => s.r === r && s.c === c)) {
    return {
      updatedShips: ships,
      updatedShots: existingShots,
      isHit: false,
      allSunk: false,
    };
  }

  let hitShipIndex = -1;
  for (let i = 0; i < ships.length; i++) {
    if (ships[i].positions.some((pos) => pos.r === r && pos.c === c)) {
      hitShipIndex = i;
      break;
    }
  }

  const isHit = hitShipIndex !== -1;
  const updatedShips = ships.map((ship, idx) => {
    if (idx !== hitShipIndex) return ship;
    const newHits = ship.hits + 1;
    const isNowSunk = newHits >= ship.size;
    return {
      ...ship,
      hits: newHits,
      sunk: isNowSunk,
    };
  });

  const sunkShipName =
    isHit && updatedShips[hitShipIndex].sunk
      ? updatedShips[hitShipIndex].name
      : undefined;

  const newShot: ShotRecord = {
    r,
    c,
    isHit,
    shipId: isHit ? updatedShips[hitShipIndex].id : '',
    sunkShipName: sunkShipName || '',
    timestamp: Date.now(),
  };

  const updatedShots = [...existingShots, newShot];
  const allSunk = updatedShips.length > 0 && updatedShips.every((s) => s.sunk);

  return {
    updatedShips,
    updatedShots,
    isHit,
    sunkShipName,
    allSunk,
  };
}

/**
 * Smart Hunter AI for Battleship:
 * 1. Checks if there is a known hit on an unsunk ship.
 *    If so, tests adjacent untargeted cells (N, S, E, W) to sink it.
 * 2. If no damaged ship pending, searches in checkerboard pattern or random untargeted cell.
 */
export function getSmartBotShot(
  shotsFired: ShotRecord[],
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS
): Coord {
  const firedSet = new Set(shotsFired.map((s) => `${s.r},${s.c}`));

  // 1. Identify hits that belong to unsunk ships
  // If a ship is sunk, all its hits are accounted for.
  const hits = shotsFired.filter((s) => s.isHit);
  const unsunkHits: ShotRecord[] = [];

  for (const hit of hits) {
    // If this hit was marked as sinking a ship, or belongs to a known sunk ship
    // let's check if the shot has a sunkShipName
    if (!hit.sunkShipName) {
      unsunkHits.push(hit);
    }
  }

  // If we have unsunk hits, search adjacent cells
  if (unsunkHits.length > 0) {
    // If there are 2 or more adjacent hits, prioritize the line orientation
    if (unsunkHits.length >= 2) {
      const h1 = unsunkHits[0];
      const h2 = unsunkHits[1];
      const isHorizontal = h1.r === h2.r;

      if (isHorizontal) {
        // Try along horizontal row
        const row = h1.r;
        const colsTaken = unsunkHits.filter((h) => h.r === row).map((h) => h.c);
        const minC = Math.min(...colsTaken);
        const maxC = Math.max(...colsTaken);

        const candidates = [
          { r: row, c: minC - 1 },
          { r: row, c: maxC + 1 },
        ].filter(
          (cand) =>
            cand.c >= 0 &&
            cand.c < cols &&
            !firedSet.has(`${cand.r},${cand.c}`)
        );

        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else {
        // Try along vertical column
        const col = h1.c;
        const rowsTaken = unsunkHits.filter((h) => h.c === col).map((h) => h.r);
        const minR = Math.min(...rowsTaken);
        const maxR = Math.max(...rowsTaken);

        const candidates = [
          { r: minR - 1, c: col },
          { r: maxR + 1, c: col },
        ].filter(
          (cand) =>
            cand.r >= 0 &&
            cand.r < rows &&
            !firedSet.has(`${cand.r},${cand.c}`)
        );

        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }

    // Try any orthogonal neighbor of unsunk hits
    for (const hit of unsunkHits) {
      const neighbors = [
        { r: hit.r - 1, c: hit.c },
        { r: hit.r + 1, c: hit.c },
        { r: hit.r, c: hit.c - 1 },
        { r: hit.r, c: hit.c + 1 },
      ].filter(
        (cand) =>
          cand.r >= 0 &&
          cand.r < rows &&
          cand.c >= 0 &&
          cand.c < cols &&
          !firedSet.has(`${cand.r},${cand.c}`)
      );

      if (neighbors.length > 0) {
        return neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }
  }

  // 2. Parity Search (Hunt mode): checkerboard pattern (r + c) % 2 === 0
  const parityCandidates: Coord[] = [];
  const allCandidates: Coord[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!firedSet.has(`${r},${c}`)) {
        allCandidates.push({ r, c });
        if ((r + c) % 2 === 0) {
          parityCandidates.push({ r, c });
        }
      }
    }
  }

  if (parityCandidates.length > 0) {
    return parityCandidates[Math.floor(Math.random() * parityCandidates.length)];
  }

  if (allCandidates.length > 0) {
    return allCandidates[Math.floor(Math.random() * allCandidates.length)];
  }

  return { r: 0, c: 0 };
}
