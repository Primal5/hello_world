import * as THREE from 'three';

export interface DungeonWallSegment {
  id: string;
  start: THREE.Vector2;
  end: THREE.Vector2;
  thickness: number;
  height: number;
  axis: 'x' | 'z';
  priority: number;
  // Only structural wall runs participate in corner/junction trimming.
  affectsJoins: boolean;
  center: THREE.Vector3;
  size: THREE.Vector3;
  line: number;
}

export interface DungeonDoorDefinition {
  id: string;
  center: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  rotationY: number;
  obstacleId: string;
  locked: boolean;
  entrance: boolean;
}

export interface DungeonLayout {
  floorCenter: THREE.Vector3;
  ceilingCenter: THREE.Vector3;
  floorSize: number;
  height: number;
  wallSegments: DungeonWallSegment[];
  doors: DungeonDoorDefinition[];
  chestPosition: THREE.Vector3;
  npcPosition: THREE.Vector3;
  exteriorGroundCenter: THREE.Vector3;
  exteriorGroundSize: THREE.Vector2;
}

interface MazeCell {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
  visited: boolean;
}

interface CellCoord {
  col: number;
  row: number;
}

interface InteriorDoorCandidate {
  axis: 'x' | 'z';
  line: number;
  indexOnLine: number;
  boundaryStart: number;
  boundaryEnd: number;
  center: number;
  score: number;
  a: CellCoord;
  b: CellCoord;
}

const DUNGEON_SIZE = 100;
const GRID_SIZE = 20;
const CELL_SIZE = DUNGEON_SIZE / GRID_SIZE;
const MIN_X = -DUNGEON_SIZE / 2;
const MIN_Z = 0;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.6;
const DOOR_WIDTH = 1.4043151140213013;
const DOOR_HEIGHT = 2.000000298023224;
const DOOR_DEPTH = 0.21565186977386475;
const MIN_DOOR_SIDE_WALL = 1;
const MIN_INTERIOR_DOORS = 24;
const MAX_INTERIOR_DOORS = 40;
const INTERIOR_DOOR_RATIO = 0.6;
const SAME_LINE_DOOR_GAP = 1;
const ENTRANCE_COLUMN = Math.floor(GRID_SIZE / 2);
const ENTRANCE_X = MIN_X + ENTRANCE_COLUMN * CELL_SIZE + CELL_SIZE / 2;
const ENTRANCE_Z = MIN_Z;
const HORIZONTAL_PRIORITY = 1;
const VERTICAL_PRIORITY = 0;

export const DUNGEON_CONFIG = {
  size: DUNGEON_SIZE,
  height: WALL_HEIGHT,
  ceilingY: WALL_HEIGHT,
  startPosition: new THREE.Vector3(ENTRANCE_X, 0, -10),
  startYaw: Math.PI
} as const;

export function generateDungeonLayout(): DungeonLayout {
  const cells = createCells();
  carveMaze(cells, ENTRANCE_COLUMN, 0);

  cells[0][ENTRANCE_COLUMN].north = false;
  cells[1][ENTRANCE_COLUMN].south = false;
  cells[1][ENTRANCE_COLUMN].north = false;
  cells[2][ENTRANCE_COLUMN].south = false;

  const horizontalEdges = Array.from({ length: GRID_SIZE + 1 }, () => Array.from({ length: GRID_SIZE }, () => false));
  const verticalEdges = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE + 1 }, () => false));

  fillBoundaryEdges(horizontalEdges, verticalEdges);
  fillInteriorEdges(cells, horizontalEdges, verticalEdges);
  horizontalEdges[0][ENTRANCE_COLUMN] = false;

  const wallSegments = buildWallSegments(horizontalEdges, verticalEdges);
  addEntranceSideWalls(wallSegments);

  const interiorDoors = insertInteriorDoors(cells, wallSegments);
  const doors = [createEntranceDoor(), ...interiorDoors];
  addDoorLintels(wallSegments, doors);

  return {
    floorCenter: new THREE.Vector3(0, 0, MIN_Z + DUNGEON_SIZE / 2),
    ceilingCenter: new THREE.Vector3(0, WALL_HEIGHT, MIN_Z + DUNGEON_SIZE / 2),
    floorSize: DUNGEON_SIZE,
    height: WALL_HEIGHT,
    wallSegments,
    doors,
    chestPosition: new THREE.Vector3(ENTRANCE_X + (DOOR_WIDTH / 2 + 1), 0, -1),
    npcPosition: new THREE.Vector3(ENTRANCE_X - (DOOR_WIDTH / 2 + 1), 0, -1),
    exteriorGroundCenter: new THREE.Vector3(ENTRANCE_X, 0, -17),
    exteriorGroundSize: new THREE.Vector2(36, 34)
  };
}

function createCells(): MazeCell[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      north: true,
      south: true,
      east: true,
      west: true,
      visited: false
    }))
  );
}

function carveMaze(cells: MazeCell[][], startCol: number, startRow: number): void {
  const stack = [{ col: startCol, row: startRow }];
  cells[startRow][startCol].visited = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(cells, current.col, current.row);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    removeWallBetween(cells, current.col, current.row, next.col, next.row);
    cells[next.row][next.col].visited = true;
    stack.push(next);
  }
}

function getUnvisitedNeighbors(cells: MazeCell[][], col: number, row: number): Array<{ col: number; row: number }> {
  const candidates = [
    { col, row: row - 1 },
    { col, row: row + 1 },
    { col: col - 1, row },
    { col: col + 1, row }
  ];

  return candidates.filter((candidate) =>
    candidate.col >= 0 &&
    candidate.col < GRID_SIZE &&
    candidate.row >= 0 &&
    candidate.row < GRID_SIZE &&
    !cells[candidate.row][candidate.col].visited
  );
}

function removeWallBetween(cells: MazeCell[][], colA: number, rowA: number, colB: number, rowB: number): void {
  if (colA === colB) {
    if (rowA < rowB) {
      cells[rowA][colA].north = false;
      cells[rowB][colB].south = false;
      return;
    }

    cells[rowA][colA].south = false;
    cells[rowB][colB].north = false;
    return;
  }

  if (colA < colB) {
    cells[rowA][colA].east = false;
    cells[rowB][colB].west = false;
    return;
  }

  cells[rowA][colA].west = false;
  cells[rowB][colB].east = false;
}

function fillBoundaryEdges(horizontalEdges: boolean[][], verticalEdges: boolean[][]): void {
  for (let col = 0; col < GRID_SIZE; col += 1) {
    horizontalEdges[0][col] = true;
    horizontalEdges[GRID_SIZE][col] = true;
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    verticalEdges[row][0] = true;
    verticalEdges[row][GRID_SIZE] = true;
  }
}

function fillInteriorEdges(cells: MazeCell[][], horizontalEdges: boolean[][], verticalEdges: boolean[][]): void {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = cells[row][col];

      if (row < GRID_SIZE - 1 && cell.north) {
        horizontalEdges[row + 1][col] = true;
      }

      if (col < GRID_SIZE - 1 && cell.east) {
        verticalEdges[row][col + 1] = true;
      }
    }
  }
}

function buildWallSegments(horizontalEdges: boolean[][], verticalEdges: boolean[][]): DungeonWallSegment[] {
  const segments: DungeonWallSegment[] = [];
  let segmentId = 0;

  for (let rowLine = 0; rowLine <= GRID_SIZE; rowLine += 1) {
    let startCol = -1;
    for (let col = 0; col <= GRID_SIZE; col += 1) {
      const occupied = col < GRID_SIZE ? horizontalEdges[rowLine][col] : false;
      if (occupied && startCol === -1) {
        startCol = col;
      }

      if (!occupied && startCol !== -1) {
        const xMin = MIN_X + startCol * CELL_SIZE;
        const xMax = MIN_X + col * CELL_SIZE;
        const z = MIN_Z + rowLine * CELL_SIZE;
        segments.push(horizontalWall(`wall_${segmentId++}`, xMin, xMax, z));
        startCol = -1;
      }
    }
  }

  for (let colLine = 0; colLine <= GRID_SIZE; colLine += 1) {
    let startRow = -1;
    for (let row = 0; row <= GRID_SIZE; row += 1) {
      const occupied = row < GRID_SIZE ? verticalEdges[row][colLine] : false;
      if (occupied && startRow === -1) {
        startRow = row;
      }

      if (!occupied && startRow !== -1) {
        const x = MIN_X + colLine * CELL_SIZE;
        const zMin = MIN_Z + startRow * CELL_SIZE;
        const zMax = MIN_Z + row * CELL_SIZE;
        segments.push(verticalWall(`wall_${segmentId++}`, x, zMin, zMax));
        startRow = -1;
      }
    }
  }

  return segments;
}

function createEntranceDoor(): DungeonDoorDefinition {
  return {
    id: 'entrance_door',
    center: new THREE.Vector3(ENTRANCE_X, 0, ENTRANCE_Z),
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    depth: DOOR_DEPTH,
    rotationY: 0,
    obstacleId: 'door_obstacle_entrance',
    locked: true,
    entrance: true
  };
}

function insertInteriorDoors(cells: MazeCell[][], wallSegments: DungeonWallSegment[]): DungeonDoorDefinition[] {
  const candidates = buildInteriorDoorCandidates(cells)
    .sort((left, right) => right.score - left.score);
  const targetDoorCount = Math.min(
    MAX_INTERIOR_DOORS,
    Math.max(MIN_INTERIOR_DOORS, Math.round(candidates.length * INTERIOR_DOOR_RATIO))
  );
  const selectedCandidates = selectInteriorDoorCandidates(candidates, targetDoorCount);
  const doors: DungeonDoorDefinition[] = [];

  for (let index = 0; index < selectedCandidates.length; index += 1) {
    const candidate = selectedCandidates[index];
    addInteriorDoorSideWalls(wallSegments, candidate, index);
    doors.push(createInteriorDoor(candidate, index));
  }

  return doors;
}

function buildInteriorDoorCandidates(cells: MazeCell[][]): InteriorDoorCandidate[] {
  const candidates: InteriorDoorCandidate[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = cells[row][col];

      if (row < GRID_SIZE - 1 && !cell.north) {
        const other = { col, row: row + 1 };
        if (isMandatoryTransition(cells, { col, row }, other)) {
          const southCell = cells[row][col];
          const northCell = cells[row + 1][col];
          const score = getInteriorDoorScore(southCell, northCell);
          if (score > 0 && CELL_SIZE >= DOOR_WIDTH + MIN_DOOR_SIDE_WALL * 2) {
            const boundaryStart = MIN_X + col * CELL_SIZE;
            const boundaryEnd = boundaryStart + CELL_SIZE;
            const center = (boundaryStart + boundaryEnd) / 2;
            candidates.push({
              axis: 'x',
              line: MIN_Z + (row + 1) * CELL_SIZE,
              indexOnLine: col,
              boundaryStart,
              boundaryEnd,
              center,
              score,
              a: { col, row },
              b: other
            });
          }
        }
      }

      if (col < GRID_SIZE - 1 && !cell.east) {
        const other = { col: col + 1, row };
        if (isMandatoryTransition(cells, { col, row }, other)) {
          const westCell = cells[row][col];
          const eastCell = cells[row][col + 1];
          const score = getInteriorDoorScore(westCell, eastCell);
          if (score > 0 && CELL_SIZE >= DOOR_WIDTH + MIN_DOOR_SIDE_WALL * 2) {
            const boundaryStart = MIN_Z + row * CELL_SIZE;
            const boundaryEnd = boundaryStart + CELL_SIZE;
            const center = (boundaryStart + boundaryEnd) / 2;
            candidates.push({
              axis: 'z',
              line: MIN_X + (col + 1) * CELL_SIZE,
              indexOnLine: row,
              boundaryStart,
              boundaryEnd,
              center,
              score,
              a: { col, row },
              b: other
            });
          }
        }
      }
    }
  }

  return candidates;
}

function isMandatoryTransition(cells: MazeCell[][], start: CellCoord, target: CellCoord): boolean {
  const visited = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => false));
  const queue: CellCoord[] = [start];
  visited[start.row][start.col] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const next of getReachableNeighbors(cells, current, start, target)) {
      if (visited[next.row][next.col]) {
        continue;
      }

      if (next.col === target.col && next.row === target.row) {
        return false;
      }

      visited[next.row][next.col] = true;
      queue.push(next);
    }
  }

  return true;
}

function getReachableNeighbors(
  cells: MazeCell[][],
  current: CellCoord,
  blockedA: CellCoord,
  blockedB: CellCoord
): CellCoord[] {
  const cell = cells[current.row][current.col];
  const neighbors: CellCoord[] = [];

  const candidates = [
    { allowed: !cell.north, next: { col: current.col, row: current.row + 1 } },
    { allowed: !cell.south, next: { col: current.col, row: current.row - 1 } },
    { allowed: !cell.east, next: { col: current.col + 1, row: current.row } },
    { allowed: !cell.west, next: { col: current.col - 1, row: current.row } }
  ];

  for (const candidate of candidates) {
    if (!candidate.allowed) {
      continue;
    }

    if (candidate.next.col < 0 || candidate.next.col >= GRID_SIZE || candidate.next.row < 0 || candidate.next.row >= GRID_SIZE) {
      continue;
    }

    const crossesBlockedEdge =
      (current.col === blockedA.col && current.row === blockedA.row && candidate.next.col === blockedB.col && candidate.next.row === blockedB.row) ||
      (current.col === blockedB.col && current.row === blockedB.row && candidate.next.col === blockedA.col && candidate.next.row === blockedA.row);

    if (!crossesBlockedEdge) {
      neighbors.push(candidate.next);
    }
  }

  return neighbors;
}

function getInteriorDoorScore(a: MazeCell, b: MazeCell): number {
  const typeA = getCellSpaceType(a);
  const typeB = getCellSpaceType(b);

  if (typeA !== typeB) {
    return 3 + Math.random() * 0.35;
  }

  if (typeA === 'room') {
    return 1 + Math.random() * 0.2;
  }

  return 0.1 + Math.random() * 0.05;
}

function getCellSpaceType(cell: MazeCell): 'room' | 'corridor' {
  const openSides = Number(!cell.north) + Number(!cell.south) + Number(!cell.east) + Number(!cell.west);
  return openSides >= 3 ? 'room' : 'corridor';
}

function selectInteriorDoorCandidates(
  candidates: InteriorDoorCandidate[],
  targetDoorCount: number
): InteriorDoorCandidate[] {
  const selected: InteriorDoorCandidate[] = [];

  for (const candidate of candidates) {
    if (selected.length >= targetDoorCount) {
      break;
    }

    const conflicts = selected.some((placed) => {
      if (placed.axis !== candidate.axis) {
        return false;
      }

      if (Math.abs(placed.line - candidate.line) > 0.001) {
        return false;
      }

      return Math.abs(placed.indexOnLine - candidate.indexOnLine) <= SAME_LINE_DOOR_GAP;
    });

    if (!conflicts) {
      selected.push(candidate);
    }
  }

  return selected;
}

function createInteriorDoor(candidate: InteriorDoorCandidate, index: number): DungeonDoorDefinition {
  if (candidate.axis === 'x') {
    return {
      id: `interior_door_${index}`,
      center: new THREE.Vector3(candidate.center, 0, candidate.line),
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      depth: DOOR_DEPTH,
      rotationY: 0,
      obstacleId: `door_obstacle_interior_${index}`,
      locked: false,
      entrance: false
    };
  }

  return {
    id: `interior_door_${index}`,
    center: new THREE.Vector3(candidate.line, 0, candidate.center),
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    depth: DOOR_DEPTH,
    rotationY: Math.PI / 2,
    obstacleId: `door_obstacle_interior_${index}`,
    locked: false,
    entrance: false
  };
}

function addEntranceSideWalls(segments: DungeonWallSegment[]): void {
  const cellStartX = MIN_X + ENTRANCE_COLUMN * CELL_SIZE;
  const cellEndX = cellStartX + CELL_SIZE;
  const doorLeftX = ENTRANCE_X - DOOR_WIDTH / 2;
  const doorRightX = ENTRANCE_X + DOOR_WIDTH / 2;

  if (doorLeftX > cellStartX) {
    segments.push(horizontalWall('wall_entrance_left', cellStartX, doorLeftX, ENTRANCE_Z));
  }

  if (doorRightX < cellEndX) {
    segments.push(horizontalWall('wall_entrance_right', doorRightX, cellEndX, ENTRANCE_Z));
  }
}

function addInteriorDoorSideWalls(
  segments: DungeonWallSegment[],
  candidate: InteriorDoorCandidate,
  index: number
): void {
  const doorStart = candidate.center - DOOR_WIDTH / 2;
  const doorEnd = candidate.center + DOOR_WIDTH / 2;

  if (candidate.axis === 'x') {
    if (doorStart > candidate.boundaryStart) {
      segments.push(frameHorizontalWall(`interior_door_${index}_left`, candidate.boundaryStart, doorStart, candidate.line));
    }

    if (doorEnd < candidate.boundaryEnd) {
      segments.push(frameHorizontalWall(`interior_door_${index}_right`, doorEnd, candidate.boundaryEnd, candidate.line));
    }

    return;
  }

  if (doorStart > candidate.boundaryStart) {
    segments.push(frameVerticalWall(`interior_door_${index}_bottom`, candidate.line, candidate.boundaryStart, doorStart));
  }

  if (doorEnd < candidate.boundaryEnd) {
    segments.push(frameVerticalWall(`interior_door_${index}_top`, candidate.line, doorEnd, candidate.boundaryEnd));
  }
}

function addDoorLintels(segments: DungeonWallSegment[], doors: DungeonDoorDefinition[]): void {
  for (const door of doors) {
    const lintelHeight = WALL_HEIGHT - door.height;
    if (lintelHeight <= 0) {
      continue;
    }

    if (Math.abs(Math.sin(door.rotationY)) < 0.5) {
      segments.push({
        id: `${door.id}_lintel`,
        start: new THREE.Vector2(door.center.x - door.width / 2, door.center.z),
        end: new THREE.Vector2(door.center.x + door.width / 2, door.center.z),
        thickness: WALL_THICKNESS,
        height: lintelHeight,
        axis: 'x',
        priority: HORIZONTAL_PRIORITY,
        affectsJoins: false,
        center: new THREE.Vector3(door.center.x, door.height + lintelHeight / 2, door.center.z),
        size: new THREE.Vector3(door.width, lintelHeight, WALL_THICKNESS),
        line: door.center.z
      });
      continue;
    }

    segments.push({
      id: `${door.id}_lintel`,
      start: new THREE.Vector2(door.center.x, door.center.z - door.width / 2),
      end: new THREE.Vector2(door.center.x, door.center.z + door.width / 2),
      thickness: WALL_THICKNESS,
      height: lintelHeight,
      axis: 'z',
      priority: VERTICAL_PRIORITY,
      affectsJoins: false,
      center: new THREE.Vector3(door.center.x, door.height + lintelHeight / 2, door.center.z),
      size: new THREE.Vector3(WALL_THICKNESS, lintelHeight, door.width),
      line: door.center.x
    });
  }
}

function frameHorizontalWall(id: string, xMin: number, xMax: number, z: number): DungeonWallSegment {
  return {
    ...horizontalWall(id, xMin, xMax, z),
    affectsJoins: false
  };
}

function frameVerticalWall(id: string, x: number, zMin: number, zMax: number): DungeonWallSegment {
  return {
    ...verticalWall(id, x, zMin, zMax),
    affectsJoins: false
  };
}

function horizontalWall(id: string, xMin: number, xMax: number, z: number): DungeonWallSegment {
  const center = new THREE.Vector3((xMin + xMax) / 2, WALL_HEIGHT / 2, z);
  const size = new THREE.Vector3(xMax - xMin, WALL_HEIGHT, WALL_THICKNESS);
  return {
    id,
    start: new THREE.Vector2(xMin, z),
    end: new THREE.Vector2(xMax, z),
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    axis: 'x',
    priority: HORIZONTAL_PRIORITY,
    affectsJoins: true,
    center,
    size,
    line: z
  };
}

function verticalWall(id: string, x: number, zMin: number, zMax: number): DungeonWallSegment {
  const center = new THREE.Vector3(x, WALL_HEIGHT / 2, (zMin + zMax) / 2);
  const size = new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, zMax - zMin);
  return {
    id,
    start: new THREE.Vector2(x, zMin),
    end: new THREE.Vector2(x, zMax),
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    axis: 'z',
    priority: VERTICAL_PRIORITY,
    affectsJoins: true,
    center,
    size,
    line: x
  };
}
