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

export type DungeonRoomType = 'spawn' | 'normal' | 'keyRoom' | 'lockedDoorRoom' | 'boss' | 'treasure';

interface CellCoord {
  col: number;
  row: number;
}

interface RoomBounds {
  minCol: number;
  minRow: number;
  width: number;
  height: number;
}

interface RoomWorldBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

interface CorridorTransition {
  roomId: string;
  center: THREE.Vector3;
  rotationY: number;
  openingStart: number;
  openingEnd: number;
  wallStart: number;
  wallEnd: number;
  locked: boolean;
  entrance: boolean;
}

export interface DungeonRoomNode {
  id: string;
  type: DungeonRoomType;
  connections: string[];
  centerCell: CellCoord;
  bounds: RoomBounds;
}

export interface DungeonCorridorEdge {
  id: string;
  from: string;
  to: string;
  axis: 'x' | 'z';
  width: number;
  cells: CellCoord[];
}

export interface DungeonGraph {
  rooms: DungeonRoomNode[];
  corridors: DungeonCorridorEdge[];
}

export interface DungeonLayout {
  floorCenter: THREE.Vector3;
  ceilingCenter: THREE.Vector3;
  floorSize: THREE.Vector2;
  height: number;
  graph: DungeonGraph;
  wallSegments: DungeonWallSegment[];
  doors: DungeonDoorDefinition[];
  chestPosition: THREE.Vector3;
  npcPosition: THREE.Vector3;
  exteriorGroundCenter: THREE.Vector3;
  exteriorGroundSize: THREE.Vector2;
}

interface RoomSeed {
  id: string;
  type: DungeonRoomType;
  bounds: RoomBounds;
}

interface CorridorSeed {
  id: string;
  from: string;
  to: string;
  axis: 'x' | 'z';
  lane: number;
  width: number;
}

interface CorridorPlanSpec {
  id: string;
  from: string;
  to: string;
  axis: 'x' | 'z';
  maxWidth: number;
}

interface SeedRoomOptions {
  colRange: [number, number];
  rowRange: [number, number];
  widthRange: [number, number];
  heightRange: [number, number];
}

interface RelativeRoomOptions {
  base: RoomBounds;
  direction: 'north' | 'south' | 'east' | 'west';
  gapRange: [number, number];
  widthRange: [number, number];
  heightRange: [number, number];
  lateralDrift?: number;
  colRange?: [number, number];
  rowRange?: [number, number];
}

interface Rect {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

const DUNGEON_SIZE = 100;
const GRID_SIZE = 20;
const CELL_SIZE = DUNGEON_SIZE / GRID_SIZE;
const SUBDIVISIONS = 4;
const UNIT_SIZE = CELL_SIZE / SUBDIVISIONS;
const OCCUPANCY_SIZE = GRID_SIZE * SUBDIVISIONS;
const MIN_X = -DUNGEON_SIZE / 2;
const MIN_Z = 0;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.6;
const DOOR_WIDTH = 1.4043151140213013;
const DOOR_HEIGHT = 2.000000298023224;
const DOOR_DEPTH = 0.21565186977386475;
const ENTRANCE_COLUMN = Math.floor(GRID_SIZE / 2);
const ENTRANCE_X = MIN_X + ENTRANCE_COLUMN * CELL_SIZE + CELL_SIZE / 2;
const ENTRANCE_Z = MIN_Z;
const HORIZONTAL_PRIORITY = 1;
const VERTICAL_PRIORITY = 0;

export const DUNGEON_CONFIG = {
  size: DUNGEON_SIZE,
  height: WALL_HEIGHT,
  ceilingY: WALL_HEIGHT,
  startPosition: new THREE.Vector3(ENTRANCE_X, 0, 3),
  startYaw: Math.PI
} as const;

export function generateDungeonLayout(): DungeonLayout {
  const graph = createDungeonGraph();
  const roomById = new Map(graph.rooms.map((room) => [room.id, room]));
  const occupied = createOccupancyGrid();

  for (const room of graph.rooms) {
    fillRect(occupied, getRoomRect(room.bounds));
  }

  for (const corridor of graph.corridors) {
    const fromRoom = roomById.get(corridor.from);
    const toRoom = roomById.get(corridor.to);
    if (!fromRoom || !toRoom) {
      throw new Error(`Missing room for corridor ${corridor.id}`);
    }

    fillRect(occupied, getCorridorRect(fromRoom, toRoom, corridor));
  }

  const { horizontalEdges, verticalEdges } = buildWallEdgeMaps(occupied);
  const shell = getOccupiedFootprint(occupied);

  const wallSegments = buildWallSegments(horizontalEdges, verticalEdges);

  const doors: DungeonDoorDefinition[] = [];
  let interiorDoorIndex = 0;
  for (const corridor of graph.corridors) {
    const fromRoom = roomById.get(corridor.from);
    const toRoom = roomById.get(corridor.to);
    if (!fromRoom || !toRoom) {
      continue;
    }

    const transitions = createCorridorTransitions(corridor, fromRoom, toRoom);
    for (const transition of transitions) {
      addInteriorDoorSideWalls(wallSegments, transition, interiorDoorIndex);
      doors.push(createInteriorDoor(transition, interiorDoorIndex));
      interiorDoorIndex += 1;
    }
  }

  addDoorLintels(wallSegments, doors);
  const normalizedWallSegments = removeDuplicateWallSegments(wallSegments);

  const spawnRoom = roomById.get('spawn');
  const entranceDoor = doors.find((door) => door.entrance);
  if (!spawnRoom || !entranceDoor) {
    throw new Error('Spawn room or entrance door is missing.');
  }

  const npcPosition = getSpawnNpcPosition(spawnRoom, entranceDoor);
  const chestPosition = getSpawnChestPosition(spawnRoom, entranceDoor, npcPosition, DUNGEON_CONFIG.startPosition);

  return {
    floorCenter: new THREE.Vector3(shell.center.x, 0, shell.center.y),
    ceilingCenter: new THREE.Vector3(shell.center.x, WALL_HEIGHT, shell.center.y),
    floorSize: shell.size,
    height: WALL_HEIGHT,
    graph,
    wallSegments: normalizedWallSegments,
    doors,
    chestPosition,
    npcPosition,
    exteriorGroundCenter: new THREE.Vector3(ENTRANCE_X, 0, -17),
    exteriorGroundSize: new THREE.Vector2(36, 34)
  };
}
function createDungeonGraph(): DungeonGraph {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const graph = tryCreateDungeonGraph();
      if (graph) {
        return graph;
      }
    } catch (error) {
      lastError = error;
      // Retry with a fresh spatial layout when one branch cannot fit.
    }
  }

  const reason = lastError instanceof Error ? ': ' + lastError.message : '';
  throw new Error('Unable to generate dungeon graph' + reason + '.');
}

function tryCreateDungeonGraph(): DungeonGraph | null {
  const roomSeeds: RoomSeed[] = [];
  const corridorPlans: CorridorPlanSpec[] = [];

  const addRoom = (id: string, type: DungeonRoomType, bounds: RoomBounds): RoomBounds => {
    roomSeeds.push({ id, type, bounds });
    return bounds;
  };

  const addRelativeRoom = (config: {
    id: string;
    type: DungeonRoomType;
    from: string;
    maxWidth: number;
    options: RelativeRoomOptions;
    required?: boolean;
  }): RoomBounds | null => {
    const bounds = tryCreateRelativeRoomBounds(roomSeeds, config.options);
    if (!bounds) {
      if (config.required === false) {
        return null;
      }

      throw new Error('Unable to place ' + config.id);
    }

    addRoom(config.id, config.type, bounds);
    corridorPlans.push({
      id: 'corridor_' + config.from + '_' + config.id,
      from: config.from,
      to: config.id,
      axis: config.options.direction === 'east' || config.options.direction === 'west' ? 'x' : 'z',
      maxWidth: config.maxWidth
    });
    return bounds;
  };

  const spawnBounds = addRoom(
    'spawn',
    'spawn',
    createSeedRoomBounds({
      colRange: [8, 10],
      rowRange: [0, 0],
      widthRange: [3, 3],
      heightRange: [2, 2]
    })
  );

  const room1Bounds = addRelativeRoom({
    id: 'room1',
    type: 'normal',
    from: 'spawn',
    maxWidth: 1,
    options: {
      base: spawnBounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 2],
      heightRange: [2, 2],
      lateralDrift: 1,
      colRange: [7, 10],
      rowRange: [3, 5]
    }
  });
  if (!room1Bounds) {
    return null;
  }

  const room2Bounds = addRelativeRoom({
    id: 'room2',
    type: 'normal',
    from: 'room1',
    maxWidth: 0.75,
    options: {
      base: room1Bounds,
      direction: 'west',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [3, 7],
      rowRange: [3, 6]
    }
  });
  if (!room2Bounds) {
    return null;
  }

  const room3Bounds = addRelativeRoom({
    id: 'room3',
    type: 'treasure',
    from: 'room1',
    maxWidth: 0.75,
    options: {
      base: room1Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [11, 14],
      rowRange: [3, 6]
    }
  });
  if (!room3Bounds) {
    return null;
  }

  const room4Bounds = addRelativeRoom({
    id: 'room4',
    type: 'normal',
    from: 'room2',
    maxWidth: 0.75,
    options: {
      base: room2Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [2, 7],
      rowRange: [5, 10]
    }
  });
  if (!room4Bounds) {
    return null;
  }

  const room5Bounds = addRelativeRoom({
    id: 'room5',
    type: 'keyRoom',
    from: 'room3',
    maxWidth: 1,
    options: {
      base: room3Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 2],
      heightRange: [2, 2],
      lateralDrift: 1,
      colRange: [11, 14],
      rowRange: [5, 10]
    }
  });
  if (!room5Bounds) {
    return null;
  }

  const room6Bounds = addRelativeRoom({
    id: 'room6',
    type: 'treasure',
    from: 'room4',
    maxWidth: 0.75,
    options: {
      base: room4Bounds,
      direction: 'west',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [1, 4],
      rowRange: [5, 10]
    }
  });
  if (!room6Bounds) {
    return null;
  }

  const room7Bounds = addRelativeRoom({
    id: 'room7',
    type: 'normal',
    from: 'room5',
    maxWidth: 0.75,
    options: {
      base: room5Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [15, 17],
      rowRange: [5, 10]
    }
  });
  if (!room7Bounds) {
    return null;
  }

  const room8Bounds = addRelativeRoom({
    id: 'room8',
    type: 'normal',
    from: 'room4',
    maxWidth: 0.75,
    options: {
      base: room4Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [2, 7],
      rowRange: [8, 13]
    }
  });
  if (!room8Bounds) {
    return null;
  }

  const room9Bounds = addRelativeRoom({
    id: 'room9',
    type: 'lockedDoorRoom',
    from: 'room5',
    maxWidth: 0.75,
    options: {
      base: room5Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 2],
      heightRange: [2, 2],
      lateralDrift: 1,
      colRange: [11, 14],
      rowRange: [8, 13]
    }
  });
  if (!room9Bounds) {
    return null;
  }

  const room10Bounds = addRelativeRoom({
    id: 'room10',
    type: 'normal',
    from: 'room8',
    maxWidth: 0.75,
    options: {
      base: room8Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [8, 11],
      rowRange: [8, 13]
    }
  });
  if (!room10Bounds) {
    return null;
  }

  const room11Bounds = addRelativeRoom({
    id: 'room11',
    type: 'treasure',
    from: 'room8',
    maxWidth: 0.75,
    options: {
      base: room8Bounds,
      direction: 'west',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [1, 3],
      rowRange: [8, 13]
    }
  });
  if (!room11Bounds) {
    return null;
  }

  const room12Bounds = addRelativeRoom({
    id: 'room12',
    type: 'normal',
    from: 'room10',
    maxWidth: 0.75,
    options: {
      base: room10Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [8, 11],
      rowRange: [11, 17]
    }
  });
  if (!room12Bounds) {
    return null;
  }

  const room13Bounds = addRelativeRoom({
    id: 'room13',
    type: 'normal',
    from: 'room11',
    maxWidth: 0.75,
    options: {
      base: room11Bounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [1, 3],
      rowRange: [11, 17]
    }
  });
  if (!room13Bounds) {
    return null;
  }

  const bossBounds = addRelativeRoom({
    id: 'boss',
    type: 'boss',
    from: 'room9',
    maxWidth: 1,
    options: {
      base: room9Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 1,
      colRange: [15, 16],
      rowRange: [8, 13]
    }
  });
  if (!bossBounds) {
    return null;
  }

  addRelativeRoom({
    id: 'room14',
    type: 'treasure',
    from: 'room12',
    maxWidth: 0.75,
    options: {
      base: room12Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [1, 2],
      heightRange: [1, 2],
      lateralDrift: 1,
      colRange: [12, 15],
      rowRange: [11, 17]
    },
    required: false
  });

  addRelativeRoom({
    id: 'room15',
    type: 'normal',
    from: 'room13',
    maxWidth: 0.75,
    options: {
      base: room13Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [1, 2],
      heightRange: [1, 2],
      lateralDrift: 1,
      colRange: [5, 8],
      rowRange: [11, 17]
    },
    required: false
  });

  addRelativeRoom({
    id: 'room16',
    type: 'normal',
    from: 'room3',
    maxWidth: 0.75,
    options: {
      base: room3Bounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [1, 1],
      heightRange: [1, 2],
      lateralDrift: 1,
      colRange: [15, 17],
      rowRange: [3, 6]
    },
    required: false
  });

  addRelativeRoom({
    id: 'room17',
    type: 'treasure',
    from: 'room2',
    maxWidth: 0.75,
    options: {
      base: room2Bounds,
      direction: 'west',
      gapRange: [1, 1],
      widthRange: [1, 1],
      heightRange: [1, 2],
      lateralDrift: 1,
      colRange: [1, 4],
      rowRange: [3, 6]
    },
    required: false
  });
  const rooms = roomSeeds.map<DungeonRoomNode>((seed) => ({
    id: seed.id,
    type: seed.type,
    connections: [],
    centerCell: getRoomCenter(seed.bounds),
    bounds: seed.bounds
  }));

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const corridors = corridorPlans.map<DungeonCorridorEdge>((plan) => {
    const from = roomById.get(plan.from);
    const to = roomById.get(plan.to);
    if (!from || !to) {
      throw new Error('Invalid dungeon corridor seed: ' + plan.id);
    }

    const seed = createCorridorSeed(plan, from.bounds, to.bounds);
    from.connections.push(to.id);
    to.connections.push(from.id);

    return {
      id: seed.id,
      from: from.id,
      to: to.id,
      axis: seed.axis,
      width: seed.width,
      cells: buildCorridorCells(seed, from.bounds, to.bounds)
    };
  });

  return { rooms, corridors };
}

function createSeedRoomBounds(options: SeedRoomOptions): RoomBounds {
  const width = pickRoomDimension(options.widthRange);
  const height = pickRoomDimension(options.heightRange);
  return {
    minCol: chooseStart(options.colRange, width),
    minRow: chooseStart(options.rowRange, height),
    width,
    height
  };
}

function tryCreateRelativeRoomBounds(existingRooms: RoomSeed[], options: RelativeRoomOptions): RoomBounds | null {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const width = pickRoomDimension(options.widthRange);
    const height = pickRoomDimension(options.heightRange);
    const gap = randomInt(options.gapRange[0], options.gapRange[1]);
    const drift = options.lateralDrift ?? 1;
    let minCol = 0;
    let minRow = 0;

    if (options.direction === 'north' || options.direction === 'south') {
      const anchorCol = randomInt(options.base.minCol, options.base.minCol + options.base.width - 1);
      const colRange = normalizeStartRange(options.colRange ?? [1, GRID_SIZE - width - 1], width);
      const candidateRange: [number, number] = [
        Math.max(colRange[0], options.base.minCol - drift),
        Math.min(colRange[1], options.base.minCol + options.base.width - 1 + drift)
      ];
      if (candidateRange[0] > candidateRange[1]) {
        continue;
      }

      minCol = chooseAnchoredStart(candidateRange, width, anchorCol);
      minRow = options.direction === 'north'
        ? options.base.minRow + options.base.height + gap
        : options.base.minRow - gap - height;

      if (options.rowRange && (minRow < options.rowRange[0] || minRow > options.rowRange[1])) {
        continue;
      }
    } else {
      const anchorRow = randomInt(options.base.minRow, options.base.minRow + options.base.height - 1);
      const rowRange = normalizeStartRange(options.rowRange ?? [1, GRID_SIZE - height - 1], height);
      const candidateRange: [number, number] = [
        Math.max(rowRange[0], options.base.minRow - drift),
        Math.min(rowRange[1], options.base.minRow + options.base.height - 1 + drift)
      ];
      if (candidateRange[0] > candidateRange[1]) {
        continue;
      }

      minRow = chooseAnchoredStart(candidateRange, height, anchorRow);
      minCol = options.direction === 'east'
        ? options.base.minCol + options.base.width + gap
        : options.base.minCol - gap - width;

      if (options.colRange && (minCol < options.colRange[0] || minCol > options.colRange[1])) {
        continue;
      }
    }

    if (minCol < 1 || minRow < 1 || minCol + width > GRID_SIZE - 1 || minRow + height > GRID_SIZE - 1) {
      continue;
    }

    const candidate = { minCol, minRow, width, height };
    if (existingRooms.some((room) => roomsOverlapOrTouch(candidate, room.bounds))) {
      continue;
    }

    return candidate;
  }

  return null;
}

function normalizeStartRange(range: [number, number], size: number): [number, number] {
  return [range[0], Math.min(range[1], GRID_SIZE - size - 1)];
}

function chooseStart(range: [number, number], size: number): number {
  const normalized = normalizeStartRange(range, size);
  return randomInt(normalized[0], normalized[1]);
}

function chooseAnchoredStart(range: [number, number], size: number, anchor?: number): number {
  const normalized = normalizeStartRange(range, size);
  if (anchor === undefined) {
    return randomInt(normalized[0], normalized[1]);
  }

  const minStart = Math.max(normalized[0], anchor - size + 1);
  const maxStart = Math.min(normalized[1], anchor);
  return randomInt(minStart, maxStart);
}

function createCorridorSeed(plan: CorridorPlanSpec, from: RoomBounds, to: RoomBounds): CorridorSeed {
  const lane = plan.axis === 'z'
    ? pickOverlapLane(from.minCol, from.minCol + from.width - 1, to.minCol, to.minCol + to.width - 1)
    : pickOverlapLane(from.minRow, from.minRow + from.height - 1, to.minRow, to.minRow + to.height - 1);

  return {
    id: plan.id,
    from: plan.from,
    to: plan.to,
    axis: plan.axis,
    lane,
    width: pickCorridorWidth(plan.maxWidth)
  };
}

function pickOverlapLane(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return randomInt(Math.max(aMin, bMin), Math.min(aMax, bMax));
}

function pickCorridorWidth(maxWidth: number): number {
  const choices = [0.5, 0.75, 1].filter((value) => value <= maxWidth + 0.0001);
  return choices[randomInt(0, choices.length - 1)] ?? 0.5;
}

function pickRoomDimension(range: [number, number]): number {
  if (range[0] === range[1]) {
    return range[0];
  }

  return Math.random() < 0.6 ? range[0] : range[1];
}

function roomsOverlapOrTouch(a: RoomBounds, b: RoomBounds): boolean {
  const aMaxCol = a.minCol + a.width - 1;
  const aMaxRow = a.minRow + a.height - 1;
  const bMaxCol = b.minCol + b.width - 1;
  const bMaxRow = b.minRow + b.height - 1;

  return a.minCol <= bMaxCol + 1
    && aMaxCol + 1 >= b.minCol
    && a.minRow <= bMaxRow + 1
    && aMaxRow + 1 >= b.minRow;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getRoomCenter(bounds: RoomBounds): CellCoord {
  return {
    col: bounds.minCol + Math.floor(bounds.width / 2),
    row: bounds.minRow + Math.floor(bounds.height / 2)
  };
}
function buildCorridorCells(seed: CorridorSeed, from: RoomBounds, to: RoomBounds): CellCoord[] {
  const cells: CellCoord[] = [];

  if (seed.axis === 'z') {
    const fromBottom = from.minRow < to.minRow ? from.minRow + from.height : to.minRow + to.height;
    const toTop = from.minRow < to.minRow ? to.minRow : from.minRow;
    for (let row = fromBottom; row < toTop; row += 1) {
      cells.push({ col: seed.lane, row });
    }
    return cells;
  }

  const fromRight = from.minCol < to.minCol ? from.minCol + from.width : to.minCol + to.width;
  const toLeft = from.minCol < to.minCol ? to.minCol : from.minCol;
  for (let col = fromRight; col < toLeft; col += 1) {
    cells.push({ col, row: seed.lane });
  }
  return cells;
}

function createOccupancyGrid(): boolean[][] {
  return Array.from({ length: OCCUPANCY_SIZE }, () => Array.from({ length: OCCUPANCY_SIZE }, () => false));
}

function buildWallEdgeMaps(occupied: boolean[][]): {
  horizontalEdges: boolean[][];
  verticalEdges: boolean[][];
} {
  const horizontalEdges = Array.from({ length: OCCUPANCY_SIZE + 1 }, () => Array.from({ length: OCCUPANCY_SIZE }, () => false));
  const verticalEdges = Array.from({ length: OCCUPANCY_SIZE }, () => Array.from({ length: OCCUPANCY_SIZE + 1 }, () => false));

  for (let row = 0; row < OCCUPANCY_SIZE; row += 1) {
    for (let col = 0; col < OCCUPANCY_SIZE; col += 1) {
      if (!occupied[row][col]) {
        continue;
      }

      if (row === 0 || !occupied[row - 1][col]) {
        horizontalEdges[row][col] = true;
      }

      if (row === OCCUPANCY_SIZE - 1 || !occupied[row + 1][col]) {
        horizontalEdges[row + 1][col] = true;
      }

      if (col === 0 || !occupied[row][col - 1]) {
        verticalEdges[row][col] = true;
      }

      if (col === OCCUPANCY_SIZE - 1 || !occupied[row][col + 1]) {
        verticalEdges[row][col + 1] = true;
      }
    }
  }

  return { horizontalEdges, verticalEdges };
}

function getRoomRect(bounds: RoomBounds): Rect {
  return {
    xMin: MIN_X + bounds.minCol * CELL_SIZE,
    xMax: MIN_X + (bounds.minCol + bounds.width) * CELL_SIZE,
    zMin: MIN_Z + bounds.minRow * CELL_SIZE,
    zMax: MIN_Z + (bounds.minRow + bounds.height) * CELL_SIZE
  };
}

function getRoomWorldBounds(room: DungeonRoomNode): RoomWorldBounds {
  return getRoomRect(room.bounds);
}

function getSpawnNpcPosition(_spawnRoom: DungeonRoomNode, entranceDoor: DungeonDoorDefinition): THREE.Vector3 {
  return new THREE.Vector3(entranceDoor.center.x - 2, 0, entranceDoor.center.z - 0.9);
}

function getSpawnChestPosition(
  spawnRoom: DungeonRoomNode,
  entranceDoor: DungeonDoorDefinition,
  npcPosition: THREE.Vector3,
  playerStartPosition: THREE.Vector3
): THREE.Vector3 {
  const spawnBounds = getRoomWorldBounds(spawnRoom);
  const margin = 1;
  const doorClearance = 3.25;
  const npcClearance = 2.25;
  const playerClearance = 2.5;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = new THREE.Vector3(
      randomBetween(spawnBounds.xMin + margin, spawnBounds.xMax - margin),
      0,
      randomBetween(spawnBounds.zMin + margin, spawnBounds.zMax - margin)
    );

    if (candidate.distanceTo(entranceDoor.center) < doorClearance) {
      continue;
    }

    if (candidate.distanceTo(npcPosition) < npcClearance) {
      continue;
    }

    if (candidate.distanceTo(playerStartPosition) < playerClearance) {
      continue;
    }

    return candidate;
  }

  return new THREE.Vector3(spawnBounds.xMin + margin, 0, spawnBounds.zMin + margin);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function getCorridorRect(fromRoom: DungeonRoomNode, toRoom: DungeonRoomNode, corridor: DungeonCorridorEdge): Rect {
  const fromBounds = getRoomWorldBounds(fromRoom);
  const toBounds = getRoomWorldBounds(toRoom);
  const widthWorld = corridor.width * CELL_SIZE;
  const halfWidth = widthWorld / 2;

  if (corridor.axis === 'z') {
    const xCenter = MIN_X + corridor.cells[0].col * CELL_SIZE + CELL_SIZE / 2;
    const lower = fromBounds.zMin < toBounds.zMin ? fromBounds : toBounds;
    const upper = lower === fromBounds ? toBounds : fromBounds;
    return {
      xMin: xCenter - halfWidth,
      xMax: xCenter + halfWidth,
      zMin: lower.zMax,
      zMax: upper.zMin
    };
  }

  const zCenter = MIN_Z + corridor.cells[0].row * CELL_SIZE + CELL_SIZE / 2;
  const left = fromBounds.xMin < toBounds.xMin ? fromBounds : toBounds;
  const right = left === fromBounds ? toBounds : fromBounds;
  return {
    xMin: left.xMax,
    xMax: right.xMin,
    zMin: zCenter - halfWidth,
    zMax: zCenter + halfWidth
  };
}

function getOccupiedFootprint(occupied: boolean[][]): { center: THREE.Vector2; size: THREE.Vector2 } {
  let minCol = OCCUPANCY_SIZE;
  let maxCol = -1;
  let minRow = OCCUPANCY_SIZE;
  let maxRow = -1;

  for (let row = 0; row < OCCUPANCY_SIZE; row += 1) {
    for (let col = 0; col < OCCUPANCY_SIZE; col += 1) {
      if (!occupied[row][col]) {
        continue;
      }

      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
    }
  }

  const padding = 2;
  const xMin = MIN_X + minCol * UNIT_SIZE - padding;
  const xMax = MIN_X + (maxCol + 1) * UNIT_SIZE + padding;
  const zMin = MIN_Z + minRow * UNIT_SIZE - padding;
  const zMax = MIN_Z + (maxRow + 1) * UNIT_SIZE + padding;
  const width = xMax - xMin;
  const depth = zMax - zMin;

  return {
    center: new THREE.Vector2((xMin + xMax) / 2, (zMin + zMax) / 2),
    size: new THREE.Vector2(width, depth)
  };
}

function removeDuplicateWallSegments(segments: DungeonWallSegment[]): DungeonWallSegment[] {
  const seen = new Set<string>();
  const unique: DungeonWallSegment[] = [];

  for (const segment of segments) {
    const key = [
      segment.axis,
      segment.start.x.toFixed(4),
      segment.start.y.toFixed(4),
      segment.end.x.toFixed(4),
      segment.end.y.toFixed(4),
      segment.center.y.toFixed(4),
      segment.size.x.toFixed(4),
      segment.size.y.toFixed(4),
      segment.size.z.toFixed(4)
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(segment);
  }

  return unique;
}

function fillRect(occupied: boolean[][], rect: Rect): void {
  const startCol = Math.max(0, Math.floor((rect.xMin - MIN_X) / UNIT_SIZE));
  const endCol = Math.min(OCCUPANCY_SIZE, Math.ceil((rect.xMax - MIN_X) / UNIT_SIZE));
  const startRow = Math.max(0, Math.floor((rect.zMin - MIN_Z) / UNIT_SIZE));
  const endRow = Math.min(OCCUPANCY_SIZE, Math.ceil((rect.zMax - MIN_Z) / UNIT_SIZE));

  for (let row = startRow; row < endRow; row += 1) {
    for (let col = startCol; col < endCol; col += 1) {
      occupied[row][col] = true;
    }
  }
}

function buildWallSegments(horizontalEdges: boolean[][], verticalEdges: boolean[][]): DungeonWallSegment[] {
  const segments: DungeonWallSegment[] = [];
  let segmentId = 0;

  for (let rowLine = 0; rowLine <= OCCUPANCY_SIZE; rowLine += 1) {
    let startCol = -1;
    for (let col = 0; col <= OCCUPANCY_SIZE; col += 1) {
      const occupied = col < OCCUPANCY_SIZE ? horizontalEdges[rowLine][col] : false;
      if (occupied && startCol === -1) {
        startCol = col;
      }

      if (!occupied && startCol !== -1) {
        const xMin = MIN_X + startCol * UNIT_SIZE;
        const xMax = MIN_X + col * UNIT_SIZE;
        const z = MIN_Z + rowLine * UNIT_SIZE;
        segments.push(horizontalWall(`wall_${segmentId++}`, xMin, xMax, z));
        startCol = -1;
      }
    }
  }

  for (let colLine = 0; colLine <= OCCUPANCY_SIZE; colLine += 1) {
    let startRow = -1;
    for (let row = 0; row <= OCCUPANCY_SIZE; row += 1) {
      const occupied = row < OCCUPANCY_SIZE ? verticalEdges[row][colLine] : false;
      if (occupied && startRow === -1) {
        startRow = row;
      }

      if (!occupied && startRow !== -1) {
        const x = MIN_X + colLine * UNIT_SIZE;
        const zMin = MIN_Z + startRow * UNIT_SIZE;
        const zMax = MIN_Z + row * UNIT_SIZE;
        segments.push(verticalWall(`wall_${segmentId++}`, x, zMin, zMax));
        startRow = -1;
      }
    }
  }

  return segments;
}

function createCorridorTransitions(
  corridor: DungeonCorridorEdge,
  fromRoom: DungeonRoomNode,
  toRoom: DungeonRoomNode
): CorridorTransition[] {
  const fromBounds = getRoomWorldBounds(fromRoom);
  const toBounds = getRoomWorldBounds(toRoom);
  const corridorRect = getCorridorRect(fromRoom, toRoom, corridor);
  const isSpawnEntrance =
    (fromRoom.type === 'spawn' && toRoom.id === 'room1') ||
    (toRoom.type === 'spawn' && fromRoom.id === 'room1');

  if (corridor.axis === 'z') {
    const xCenter = (corridorRect.xMin + corridorRect.xMax) / 2;
    const lowerRoom = fromBounds.zMin < toBounds.zMin ? fromRoom : toRoom;
    const upperRoom = lowerRoom.id === fromRoom.id ? toRoom : fromRoom;
    const lowerBounds = lowerRoom.id === fromRoom.id ? fromBounds : toBounds;
    const upperBounds = upperRoom.id === toRoom.id ? toBounds : fromBounds;

    if (isSpawnEntrance) {
      const spawnRoom = lowerRoom.type === 'spawn' ? lowerRoom : upperRoom;
      const spawnBounds = spawnRoom.id === lowerRoom.id ? lowerBounds : upperBounds;
      return [
        {
          roomId: spawnRoom.id,
          center: new THREE.Vector3(xCenter, 0, spawnBounds.zMax),
          rotationY: 0,
          openingStart: corridorRect.xMin,
          openingEnd: corridorRect.xMax,
          wallStart: spawnBounds.xMin,
          wallEnd: spawnBounds.xMax,
          locked: true,
          entrance: true
        }
      ];
    }

    return [
      {
        roomId: lowerRoom.id,
        center: new THREE.Vector3(xCenter, 0, lowerBounds.zMax),
        rotationY: 0,
        openingStart: corridorRect.xMin,
        openingEnd: corridorRect.xMax,
        wallStart: lowerBounds.xMin,
        wallEnd: lowerBounds.xMax,
        locked: lowerRoom.type === 'lockedDoorRoom',
        entrance: false
      },
      {
        roomId: upperRoom.id,
        center: new THREE.Vector3(xCenter, 0, upperBounds.zMin),
        rotationY: 0,
        openingStart: corridorRect.xMin,
        openingEnd: corridorRect.xMax,
        wallStart: upperBounds.xMin,
        wallEnd: upperBounds.xMax,
        locked: upperRoom.type === 'lockedDoorRoom',
        entrance: false
      }
    ];
  }

  const zCenter = (corridorRect.zMin + corridorRect.zMax) / 2;
  const leftRoom = fromBounds.xMin < toBounds.xMin ? fromRoom : toRoom;
  const rightRoom = leftRoom.id === fromRoom.id ? toRoom : fromRoom;
  const leftBounds = leftRoom.id === fromRoom.id ? fromBounds : toBounds;
  const rightBounds = rightRoom.id === toRoom.id ? toBounds : fromBounds;

  return [
    {
      roomId: leftRoom.id,
      center: new THREE.Vector3(leftBounds.xMax, 0, zCenter),
      rotationY: Math.PI / 2,
      openingStart: corridorRect.zMin,
      openingEnd: corridorRect.zMax,
      wallStart: leftBounds.zMin,
      wallEnd: leftBounds.zMax,
      locked: leftRoom.type === 'lockedDoorRoom',
      entrance: false
    },
    {
      roomId: rightRoom.id,
      center: new THREE.Vector3(rightBounds.xMin, 0, zCenter),
      rotationY: Math.PI / 2,
      openingStart: corridorRect.zMin,
      openingEnd: corridorRect.zMax,
      wallStart: rightBounds.zMin,
      wallEnd: rightBounds.zMax,
      locked: rightRoom.type === 'lockedDoorRoom',
      entrance: false
    }
  ];
}

function createInteriorDoor(transition: CorridorTransition, index: number): DungeonDoorDefinition {
  return {
    id: transition.entrance ? 'entrance_door' : `interior_door_${index}`,
    center: transition.center,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    depth: DOOR_DEPTH,
    rotationY: transition.rotationY,
    obstacleId: transition.entrance ? 'door_obstacle_entrance' : `door_obstacle_interior_${index}`,
    locked: transition.locked,
    entrance: transition.entrance
  };
}

function addInteriorDoorSideWalls(
  segments: DungeonWallSegment[],
  transition: CorridorTransition,
  index: number
): void {
  const openingCenter = (transition.openingStart + transition.openingEnd) / 2;
  const doorStart = openingCenter - DOOR_WIDTH / 2;
  const doorEnd = openingCenter + DOOR_WIDTH / 2;

  if (Math.abs(Math.sin(transition.rotationY)) < 0.5) {
    if (doorStart > transition.wallStart) {
      replaceStructuralRangeWithFrame(
        segments,
        frameHorizontalWall(`interior_door_${index}_left`, transition.wallStart, doorStart, transition.center.z)
      );
    }

    if (doorEnd < transition.wallEnd) {
      replaceStructuralRangeWithFrame(
        segments,
        frameHorizontalWall(`interior_door_${index}_right`, doorEnd, transition.wallEnd, transition.center.z)
      );
    }

    return;
  }

  if (doorStart > transition.wallStart) {
    replaceStructuralRangeWithFrame(
      segments,
      frameVerticalWall(`interior_door_${index}_bottom`, transition.center.x, transition.wallStart, doorStart)
    );
  }

  if (doorEnd < transition.wallEnd) {
    replaceStructuralRangeWithFrame(
      segments,
      frameVerticalWall(`interior_door_${index}_top`, transition.center.x, doorEnd, transition.wallEnd)
    );
  }
}

function replaceStructuralRangeWithFrame(
  segments: DungeonWallSegment[],
  frameSegment: DungeonWallSegment
): void {
  const epsilon = 0.0001;
  const frameStart = getSegmentRangeStart(frameSegment);
  const frameEnd = getSegmentRangeEnd(frameSegment);

  for (let index = 0; index < segments.length; index += 1) {
    const candidate = segments[index];
    if (!candidate.affectsJoins || candidate.axis !== frameSegment.axis || Math.abs(candidate.line - frameSegment.line) > epsilon) {
      continue;
    }

    const candidateStart = getSegmentRangeStart(candidate);
    const candidateEnd = getSegmentRangeEnd(candidate);
    const overlapStart = Math.max(candidateStart, frameStart);
    const overlapEnd = Math.min(candidateEnd, frameEnd);

    if (overlapEnd - overlapStart <= epsilon) {
      continue;
    }

    segments.splice(index, 1);
    index -= 1;

    if (candidateStart < overlapStart - epsilon) {
      segments.push(createStructuralWallSlice(candidate, candidateStart, overlapStart, 'start'));
    }

    if (candidateEnd > overlapEnd + epsilon) {
      segments.push(createStructuralWallSlice(candidate, overlapEnd, candidateEnd, 'end'));
    }
  }

  segments.push(frameSegment);
}

function createStructuralWallSlice(
  segment: DungeonWallSegment,
  start: number,
  end: number,
  suffix: 'start' | 'end'
): DungeonWallSegment {
  if (segment.axis === 'x') {
    return horizontalWall(`${segment.id}_${suffix}`, start, end, segment.line);
  }

  return verticalWall(`${segment.id}_${suffix}`, segment.line, start, end);
}

function getSegmentRangeStart(segment: DungeonWallSegment): number {
  return segment.axis === 'x'
    ? Math.min(segment.start.x, segment.end.x)
    : Math.min(segment.start.y, segment.end.y);
}

function getSegmentRangeEnd(segment: DungeonWallSegment): number {
  return segment.axis === 'x'
    ? Math.max(segment.start.x, segment.end.x)
    : Math.max(segment.start.y, segment.end.y);
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










































