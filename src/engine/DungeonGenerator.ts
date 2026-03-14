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
  requiredItemId?: string;
  doorName?: string;
}

export interface DungeonChestDefinition {
  id: string;
  roomId: string;
  position: THREE.Vector3;
  itemId: string;
}

export type DungeonRoomType = 'spawn' | 'normal' | 'keyRoom' | 'lockedDoorRoom' | 'boss' | 'treasure';
export type DungeonZoneId = 'spawn' | 'bronze' | 'silver' | 'gold' | 'boss';

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

interface ClearancePoint {
  position: THREE.Vector3;
  minDistance: number;
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
  requiredItemId?: string;
  doorName?: string;
}

interface DoorTransitionPlacement {
  index: number;
  transition: CorridorTransition;
}

interface DoorOpening {
  placement: DoorTransitionPlacement;
  axis: 'x' | 'z';
  line: number;
  start: number;
  end: number;
}

export interface DungeonRoomNode {
  id: string;
  type: DungeonRoomType;
  zoneId: DungeonZoneId;
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
  chests: DungeonChestDefinition[];
  npcPosition: THREE.Vector3;
  exteriorGroundCenter: THREE.Vector3;
  exteriorGroundSize: THREE.Vector2;
}

interface RoomSeed {
  id: string;
  type: DungeonRoomType;
  zoneId: DungeonZoneId;
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

interface ZoneRegion {
  colRange: [number, number];
  rowRange: [number, number];
}

interface ZoneGenerationResult {
  roomIds: string[];
  entryRoomId: string;
  exitRoomId: string;
}

const DUNGEON_SIZE = 160;
const GRID_SIZE = 48;
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
const MIN_ROOM_DIMENSION_CELLS = 2;
const MIN_CORRIDOR_WIDTH_CELLS = 0.75;
const ENTRANCE_COLUMN = Math.floor(GRID_SIZE / 2);
const ENTRANCE_X = MIN_X + ENTRANCE_COLUMN * CELL_SIZE + CELL_SIZE / 2;
const ENTRANCE_Z = MIN_Z;
const HORIZONTAL_PRIORITY = 1;
const VERTICAL_PRIORITY = 0;


const ENTRANCE_DOOR_CORRIDOR_ID = 'corridor_spawn_room1';
const BRONZE_DOOR_CORRIDOR_ID = 'corridor_bronze_silver';
const SILVER_DOOR_CORRIDOR_ID = 'corridor_silver_gold';
const GOLD_DOOR_CORRIDOR_ID = 'corridor_gold_boss';
const ZONE_ROOM_TARGET = 20;
const BRONZE_ZONE_ID = 'bronze' as const;
const SILVER_ZONE_ID = 'silver' as const;
const GOLD_ZONE_ID = 'gold' as const;
const ZONE_REGIONS: Record<'bronze' | 'silver' | 'gold', ZoneRegion> = {
  bronze: {
    colRange: [4, 38],
    rowRange: [3, 14]
  },
  silver: {
    colRange: [4, 38],
    rowRange: [16, 28]
  },
  gold: {
    colRange: [4, 38],
    rowRange: [29, 41]
  }
};
const MIN_KEY_DISTANCE_FROM_SPAWN = 5;
const MIN_KEY_DISTANCE_FROM_ENTRANCE = 5;
const MIN_KEY_DISTANCE_FROM_PREVIOUS_DOOR = 5;
const CHEST_DOOR_CLEARANCE = 3.25;
const CHEST_WALL_MARGIN = 1;
const CHEST_POSITION_ATTEMPTS = 200;
const CHEST_POSITION_GRID_STEP = 0.25;
const SPAWN_NPC_X_OFFSET = 2;
const SPAWN_NPC_Z_OFFSET = 0.9;
const SPAWN_NPC_WALL_MARGIN = 0.75;

export const DUNGEON_CONFIG = {
  size: DUNGEON_SIZE,
  height: WALL_HEIGHT,
  ceilingY: WALL_HEIGHT,
  startPosition: new THREE.Vector3(ENTRANCE_X, 0, -3),
  startYaw: 0
} as const;

export function generateDungeonLayout(): DungeonLayout {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      return tryGenerateDungeonLayout();
    } catch (error) {
      lastError = error;
    }
  }

  const reason = lastError instanceof Error ? ': ' + lastError.message : '';
  throw new Error('Unable to generate dungeon layout' + reason + '.');
}

function tryGenerateDungeonLayout(): DungeonLayout {
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
  const roomDoorCenters = new Map<string, THREE.Vector3[]>();
  const doorPlacements: DoorTransitionPlacement[] = [];
  let interiorDoorIndex = 0;
  for (const corridor of graph.corridors) {
    const fromRoom = roomById.get(corridor.from);
    const toRoom = roomById.get(corridor.to);
    if (!fromRoom || !toRoom) {
      continue;
    }

    const transitions = createCorridorTransitions(corridor, fromRoom, toRoom);
    for (const transition of transitions) {
      const door = createInteriorDoor(transition, interiorDoorIndex);
      const doorCenters = roomDoorCenters.get(transition.roomId) ?? [];
      doorCenters.push(door.center.clone());
      roomDoorCenters.set(transition.roomId, doorCenters);
      doorPlacements.push({ transition, index: interiorDoorIndex });
      doors.push(door);
      interiorDoorIndex += 1;
    }
  }

  addDoorFrameSegments(wallSegments, doorPlacements);
  addDoorLintels(wallSegments, doors);
  const normalizedWallSegments = removeDuplicateWallSegments(wallSegments);

  const spawnRoom = roomById.get('spawn');
  const entranceDoor = doors.find((door) => door.entrance);
  if (!spawnRoom || !entranceDoor) {
    throw new Error('Spawn room or entrance door is missing.');
  }

  const layoutStartPosition = mirrorVector3OnZ(DUNGEON_CONFIG.startPosition);
  const npcPosition = getSpawnNpcPosition(spawnRoom, entranceDoor);
  const entranceDoorWithKey = getRequiredDoor(doors, 'rusty_key');
  const bronzeDoor = getRequiredDoor(doors, 'bronze_key');
  const silverDoor = getRequiredDoor(doors, 'silver_key');

  const rustyChestPosition = getSpawnChestPosition(
    spawnRoom,
    entranceDoor,
    npcPosition,
    layoutStartPosition,
    MIN_KEY_DISTANCE_FROM_SPAWN
  );

  const bronzeChestPlacement = pickChestPlacementWithinZone(
    graph,
    roomById,
    BRONZE_ZONE_ID,
    roomDoorCenters,
    [{ position: entranceDoorWithKey.center, minDistance: MIN_KEY_DISTANCE_FROM_ENTRANCE }],
    'Unable to place bronze key chest in the bronze zone.'
  );
  const silverChestPlacement = pickChestPlacementWithinZone(
    graph,
    roomById,
    SILVER_ZONE_ID,
    roomDoorCenters,
    [{ position: bronzeDoor.center, minDistance: MIN_KEY_DISTANCE_FROM_PREVIOUS_DOOR }],
    'Unable to place silver key chest in the silver zone.'
  );
  const goldChestPlacement = pickChestPlacementWithinZone(
    graph,
    roomById,
    GOLD_ZONE_ID,
    roomDoorCenters,
    [{ position: silverDoor.center, minDistance: MIN_KEY_DISTANCE_FROM_PREVIOUS_DOOR }],
    'Unable to place gold key chest in the gold zone.'
  );

  return mirrorDungeonLayout({
    floorCenter: new THREE.Vector3(shell.center.x, 0, shell.center.y),
    ceilingCenter: new THREE.Vector3(shell.center.x, WALL_HEIGHT, shell.center.y),
    floorSize: shell.size,
    height: WALL_HEIGHT,
    graph,
    wallSegments: normalizedWallSegments,
    doors,
    chests: [
      { id: 'rusty_key_chest', roomId: 'spawn', position: rustyChestPosition, itemId: 'rusty_key' },
      {
        id: 'bronze_key_chest',
        roomId: bronzeChestPlacement.room.id,
        position: bronzeChestPlacement.position,
        itemId: 'bronze_key'
      },
      {
        id: 'silver_key_chest',
        roomId: silverChestPlacement.room.id,
        position: silverChestPlacement.position,
        itemId: 'silver_key'
      },
      {
        id: 'gold_key_chest',
        roomId: goldChestPlacement.room.id,
        position: goldChestPlacement.position,
        itemId: 'gold_key'
      }
    ],
    npcPosition,
    exteriorGroundCenter: new THREE.Vector3(ENTRANCE_X, 0, -17),
    exteriorGroundSize: new THREE.Vector2(36, 34)
  });
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

  const addRoom = (id: string, type: DungeonRoomType, zoneId: DungeonZoneId, bounds: RoomBounds): RoomBounds => {
    roomSeeds.push({ id, type, zoneId, bounds });
    return bounds;
  };

  const addRelativeRoom = (config: {
    id: string;
    type: DungeonRoomType;
    zoneId: DungeonZoneId;
    from: string;
    maxWidth: number;
    options: RelativeRoomOptions;
    corridorId?: string;
    required?: boolean;
  }): RoomBounds | null => {
    const bounds = tryCreateRelativeRoomBounds(roomSeeds, config.options);
    if (!bounds) {
      if (config.required === false) {
        return null;
      }

      throw new Error('Unable to place ' + config.id);
    }

    addRoom(config.id, config.type, config.zoneId, bounds);
    corridorPlans.push({
      id: config.corridorId ?? ('corridor_' + config.from + '_' + config.id),
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
    'spawn',
    createSeedRoomBounds({
      colRange: [22, 22],
      rowRange: [0, 0],
      widthRange: [4, 4],
      heightRange: [2, 2]
    })
  );

  const bronzeEntryId = createZoneRoomId(BRONZE_ZONE_ID, 1);
  const bronzeEntryBounds = addRelativeRoom({
    id: bronzeEntryId,
    type: 'normal',
    zoneId: BRONZE_ZONE_ID,
    from: 'spawn',
    corridorId: ENTRANCE_DOOR_CORRIDOR_ID,
    maxWidth: 1,
    options: {
      base: spawnBounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 2,
      colRange: ZONE_REGIONS.bronze.colRange,
      rowRange: [ZONE_REGIONS.bronze.rowRange[0], ZONE_REGIONS.bronze.rowRange[0] + 2]
    }
  });
  if (!bronzeEntryBounds) {
    return null;
  }

  const bronzeZone = generateZoneRooms({
    zoneId: BRONZE_ZONE_ID,
    roomCount: ZONE_ROOM_TARGET,
    region: ZONE_REGIONS.bronze,
    entryRoomId: bronzeEntryId,
    entryBounds: bronzeEntryBounds,
    exitDirections: ['north', 'north', 'north'],
    roomSeeds,
    corridorPlans,
    addRelativeRoom
  });
  if (!bronzeZone) {
    return null;
  }

  const bronzeExitBounds = getRoomSeedBounds(roomSeeds, bronzeZone.exitRoomId);
  const silverEntryId = createZoneRoomId(SILVER_ZONE_ID, 1);
  const silverEntryBounds = addRelativeRoom({
    id: silverEntryId,
    type: 'normal',
    zoneId: SILVER_ZONE_ID,
    from: bronzeZone.exitRoomId,
    corridorId: BRONZE_DOOR_CORRIDOR_ID,
    maxWidth: 1,
    options: {
      base: bronzeExitBounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 2,
      colRange: ZONE_REGIONS.silver.colRange,
      rowRange: [ZONE_REGIONS.silver.rowRange[0], ZONE_REGIONS.silver.rowRange[0] + 2]
    }
  });
  if (!silverEntryBounds) {
    return null;
  }

  const silverZone = generateZoneRooms({
    zoneId: SILVER_ZONE_ID,
    roomCount: ZONE_ROOM_TARGET,
    region: ZONE_REGIONS.silver,
    entryRoomId: silverEntryId,
    entryBounds: silverEntryBounds,
    exitDirections: ['north', 'north', 'north'],
    roomSeeds,
    corridorPlans,
    addRelativeRoom
  });
  if (!silverZone) {
    return null;
  }

  const silverExitBounds = getRoomSeedBounds(roomSeeds, silverZone.exitRoomId);
  const goldEntryId = createZoneRoomId(GOLD_ZONE_ID, 1);
  const goldEntryBounds = addRelativeRoom({
    id: goldEntryId,
    type: 'normal',
    zoneId: GOLD_ZONE_ID,
    from: silverZone.exitRoomId,
    corridorId: SILVER_DOOR_CORRIDOR_ID,
    maxWidth: 1,
    options: {
      base: silverExitBounds,
      direction: 'north',
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 2,
      colRange: ZONE_REGIONS.gold.colRange,
      rowRange: [ZONE_REGIONS.gold.rowRange[0], ZONE_REGIONS.gold.rowRange[0] + 2]
    }
  });
  if (!goldEntryBounds) {
    return null;
  }

  const goldZone = generateZoneRooms({
    zoneId: GOLD_ZONE_ID,
    roomCount: ZONE_ROOM_TARGET,
    region: ZONE_REGIONS.gold,
    entryRoomId: goldEntryId,
    entryBounds: goldEntryBounds,
    exitDirections: ['east', 'east', 'east'],
    roomSeeds,
    corridorPlans,
    addRelativeRoom
  });
  if (!goldZone) {
    return null;
  }

  const goldExitBounds = getRoomSeedBounds(roomSeeds, goldZone.exitRoomId);
  const bossBounds = addRelativeRoom({
    id: 'boss',
    type: 'boss',
    zoneId: 'boss',
    from: goldZone.exitRoomId,
    corridorId: GOLD_DOOR_CORRIDOR_ID,
    maxWidth: 1,
    options: {
      base: goldExitBounds,
      direction: 'east',
      gapRange: [1, 1],
      widthRange: [3, 4],
      heightRange: [2, 3],
      lateralDrift: 2,
      colRange: [40, 44],
      rowRange: [31, 42]
    }
  });
  if (!bossBounds) {
    return null;
  }

  const rooms = roomSeeds.map<DungeonRoomNode>((seed) => ({
    id: seed.id,
    type: seed.type,
    zoneId: seed.zoneId,
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

function createZoneRoomId(zoneId: Exclude<DungeonZoneId, 'spawn' | 'boss'>, index: number): string {
  return `${zoneId}_${String(index).padStart(2, '0')}`;
}

function getRoomSeedBounds(roomSeeds: RoomSeed[], roomId: string): RoomBounds {
  const seed = roomSeeds.find((candidate) => candidate.id === roomId);
  if (!seed) {
    throw new Error('Missing room seed for ' + roomId);
  }

  return seed.bounds;
}

function generateZoneRooms(config: {
  zoneId: Exclude<DungeonZoneId, 'spawn' | 'boss'>;
  roomCount: number;
  region: ZoneRegion;
  entryRoomId: string;
  entryBounds: RoomBounds;
  exitDirections: Array<'north' | 'south' | 'east' | 'west'>;
  roomSeeds: RoomSeed[];
  corridorPlans: CorridorPlanSpec[];
  addRelativeRoom: (config: {
    id: string;
    type: DungeonRoomType;
    zoneId: DungeonZoneId;
    from: string;
    maxWidth: number;
    options: RelativeRoomOptions;
    corridorId?: string;
    required?: boolean;
  }) => RoomBounds | null;
}): ZoneGenerationResult | null {
  const roomIds = [config.entryRoomId];
  let exitRoomId = config.entryRoomId;
  let currentParentId = config.entryRoomId;
  let currentParentBounds = config.entryBounds;

  for (const direction of config.exitDirections) {
    const roomId = createZoneRoomId(config.zoneId, roomIds.length + 1);
    const bounds = config.addRelativeRoom({
      id: roomId,
      type: 'normal',
      zoneId: config.zoneId,
      from: currentParentId,
      maxWidth: direction === 'north' || direction === 'south' ? 1 : 0.75,
      options: createZoneRelativeOptions(currentParentBounds, config.region, direction, 'core')
    });
    if (!bounds) {
      return null;
    }

    roomIds.push(roomId);
    exitRoomId = roomId;
    currentParentId = roomId;
    currentParentBounds = bounds;
  }

  let consecutiveFailures = 0;
  while (roomIds.length < config.roomCount) {
    const roomId = createZoneRoomId(config.zoneId, roomIds.length + 1);
    const bounds = tryAddZoneBranchRoom({
      zoneId: config.zoneId,
      roomId,
      roomIds,
      roomSeeds: config.roomSeeds,
      corridorPlans: config.corridorPlans,
      region: config.region,
      addRelativeRoom: config.addRelativeRoom
    });

    if (bounds) {
      roomIds.push(roomId);
      consecutiveFailures = 0;
      continue;
    }

    consecutiveFailures += 1;
    if (consecutiveFailures > 200) {
      return null;
    }
  }

  return {
    roomIds,
    entryRoomId: config.entryRoomId,
    exitRoomId
  };
}

function tryAddZoneBranchRoom(config: {
  zoneId: Exclude<DungeonZoneId, 'spawn' | 'boss'>;
  roomId: string;
  roomIds: string[];
  roomSeeds: RoomSeed[];
  corridorPlans: CorridorPlanSpec[];
  region: ZoneRegion;
  addRelativeRoom: (config: {
    id: string;
    type: DungeonRoomType;
    zoneId: DungeonZoneId;
    from: string;
    maxWidth: number;
    options: RelativeRoomOptions;
    corridorId?: string;
    required?: boolean;
  }) => RoomBounds | null;
}): RoomBounds | null {
  const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
  const baseRoomIds = config.roomIds.filter((roomId) => getRoomConnectionDegree(roomId, config.corridorPlans) < 3);
  for (const baseRoomId of shuffleArray(baseRoomIds)) {
    const baseBounds = getRoomSeedBounds(config.roomSeeds, baseRoomId);
    const usedDirections = getUsedRoomDirections(baseRoomId, config.roomSeeds, config.corridorPlans);
    for (const direction of shuffleArray(directions.filter((candidate) => !usedDirections.has(candidate)))) {
      const bounds = config.addRelativeRoom({
        id: config.roomId,
        type: randomZoneRoomType(config.zoneId),
        zoneId: config.zoneId,
        from: baseRoomId,
        maxWidth: direction === 'north' || direction === 'south' ? 1 : 0.75,
        options: createZoneRelativeOptions(baseBounds, config.region, direction, 'branch'),
        required: false
      });
      if (bounds) {
        return bounds;
      }
    }
  }

  return null;
}

function getRoomConnectionDegree(roomId: string, corridorPlans: CorridorPlanSpec[]): number {
  return corridorPlans.filter((plan) => plan.from === roomId || plan.to === roomId).length;
}

function getUsedRoomDirections(
  roomId: string,
  roomSeeds: RoomSeed[],
  corridorPlans: CorridorPlanSpec[]
): Set<'north' | 'south' | 'east' | 'west'> {
  const bounds = getRoomSeedBounds(roomSeeds, roomId);
  const directions = new Set<'north' | 'south' | 'east' | 'west'>();

  for (const plan of corridorPlans) {
    const otherRoomId = plan.from === roomId ? plan.to : plan.to === roomId ? plan.from : null;
    if (!otherRoomId) {
      continue;
    }

    const otherBounds = getRoomSeedBounds(roomSeeds, otherRoomId);
    if (otherBounds.minCol > bounds.minCol) {
      directions.add('east');
    } else if (otherBounds.minCol < bounds.minCol) {
      directions.add('west');
    } else if (otherBounds.minRow > bounds.minRow) {
      directions.add('north');
    } else if (otherBounds.minRow < bounds.minRow) {
      directions.add('south');
    }
  }

  return directions;
}

function randomZoneRoomType(zoneId: Exclude<DungeonZoneId, 'spawn' | 'boss'>): DungeonRoomType {
  const roll = Math.random();
  if (zoneId === GOLD_ZONE_ID && roll > 0.8) {
    return 'treasure';
  }

  if (roll > 0.82) {
    return 'treasure';
  }

  return 'normal';
}

function createZoneRelativeOptions(
  base: RoomBounds,
  region: ZoneRegion,
  direction: 'north' | 'south' | 'east' | 'west',
  layout: 'core' | 'branch'
): RelativeRoomOptions {
  if (layout === 'core') {
    return {
      base,
      direction,
      gapRange: [1, 1],
      widthRange: [2, 3],
      heightRange: [2, 3],
      lateralDrift: 2,
      colRange: region.colRange,
      rowRange: region.rowRange
    };
  }

  return {
    base,
    direction,
    gapRange: [1, 1],
    widthRange: [MIN_ROOM_DIMENSION_CELLS, 2],
    heightRange: [MIN_ROOM_DIMENSION_CELLS, 2],
    lateralDrift: 3,
    colRange: region.colRange,
    rowRange: region.rowRange
  };
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
    ? pickCorridorLaneZ(plan, from, to)
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

function pickCorridorLaneZ(plan: CorridorPlanSpec, from: RoomBounds, to: RoomBounds): number {
  const overlapMin = Math.max(from.minCol, to.minCol);
  const overlapMax = Math.min(from.minCol + from.width - 1, to.minCol + to.width - 1);

  if (plan.id !== ENTRANCE_DOOR_CORRIDOR_ID) {
    return randomInt(overlapMin, overlapMax);
  }

  const spawnBounds = plan.from === 'spawn' ? from : to;
  const safeMaxLane = Math.min(overlapMax, spawnBounds.minCol + spawnBounds.width - 2);
  if (overlapMin > safeMaxLane) {
    throw new Error('Unable to reserve space for the spawn NPC to the right of the entrance door.');
  }

  return randomInt(overlapMin, safeMaxLane);
}

function pickOverlapLane(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return randomInt(Math.max(aMin, bMin), Math.min(aMax, bMax));
}

function pickCorridorWidth(maxWidth: number): number {
  const choices = [MIN_CORRIDOR_WIDTH_CELLS, 1].filter((value) => value <= maxWidth + 0.0001);
  return choices[randomInt(0, choices.length - 1)] ?? MIN_CORRIDOR_WIDTH_CELLS;
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

export function getMirroredRoomWorldBounds(room: DungeonRoomNode): RoomWorldBounds {
  const bounds = getRoomWorldBounds(room);
  return {
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    zMin: -bounds.zMax,
    zMax: -bounds.zMin
  };
}

export function getMirroredCorridorWorldBounds(
  fromRoom: DungeonRoomNode,
  toRoom: DungeonRoomNode,
  corridor: DungeonCorridorEdge
): RoomWorldBounds {
  const bounds = getCorridorRect(fromRoom, toRoom, corridor);
  return {
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    zMin: -bounds.zMax,
    zMax: -bounds.zMin
  };
}

function isInsideRoomBounds(position: THREE.Vector3, bounds: RoomWorldBounds, margin: number): boolean {
  return position.x >= bounds.xMin + margin
    && position.x <= bounds.xMax - margin
    && position.z >= bounds.zMin + margin
    && position.z <= bounds.zMax - margin;
}

function getSpawnNpcPosition(
  spawnRoom: DungeonRoomNode,
  entranceDoor: DungeonDoorDefinition
): THREE.Vector3 {
  const spawnBounds = getRoomWorldBounds(spawnRoom);
  const rightOfDoor = new THREE.Vector3(
    entranceDoor.center.x + SPAWN_NPC_X_OFFSET,
    0,
    entranceDoor.center.z - SPAWN_NPC_Z_OFFSET
  );

  if (isInsideRoomBounds(rightOfDoor, spawnBounds, SPAWN_NPC_WALL_MARGIN)) {
    return rightOfDoor;
  }

  return new THREE.Vector3(
    THREE.MathUtils.clamp(rightOfDoor.x, spawnBounds.xMin + SPAWN_NPC_WALL_MARGIN, spawnBounds.xMax - SPAWN_NPC_WALL_MARGIN),
    0,
    THREE.MathUtils.clamp(rightOfDoor.z, spawnBounds.zMin + SPAWN_NPC_WALL_MARGIN, spawnBounds.zMax - SPAWN_NPC_WALL_MARGIN)
  );
}

function getSpawnChestPosition(
  spawnRoom: DungeonRoomNode,
  entranceDoor: DungeonDoorDefinition,
  npcPosition: THREE.Vector3,
  playerStartPosition: THREE.Vector3,
  playerClearance: number
): THREE.Vector3 {
  const spawnBounds = getRoomWorldBounds(spawnRoom);
  const margin = 1;
  const doorClearance = 3.25;
  const npcClearance = 2.25;

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

function mirrorDungeonLayout(layout: DungeonLayout): DungeonLayout {
  return {
    ...layout,
    floorCenter: mirrorVector3OnZ(layout.floorCenter),
    ceilingCenter: mirrorVector3OnZ(layout.ceilingCenter),
    wallSegments: layout.wallSegments.map(mirrorWallSegmentOnZ),
    doors: layout.doors.map(mirrorDoorOnZ),
    chests: layout.chests.map((chest) => ({
      ...chest,
      position: mirrorVector3OnZ(chest.position)
    })),
    npcPosition: mirrorVector3OnZ(layout.npcPosition),
    exteriorGroundCenter: mirrorVector3OnZ(layout.exteriorGroundCenter)
  };
}

function mirrorVector3OnZ(vector: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.y, -vector.z);
}

function mirrorWallSegmentOnZ(segment: DungeonWallSegment): DungeonWallSegment {
  const start = new THREE.Vector2(segment.start.x, -segment.start.y);
  const end = new THREE.Vector2(segment.end.x, -segment.end.y);
  const normalizedStart = segment.axis === 'z' && start.y > end.y ? end : start;
  const normalizedEnd = segment.axis === 'z' && start.y > end.y ? start : end;

  return {
    ...segment,
    start: normalizedStart,
    end: normalizedEnd,
    center: mirrorVector3OnZ(segment.center),
    line: segment.axis === 'x' ? -segment.line : segment.line
  };
}

function mirrorDoorOnZ(door: DungeonDoorDefinition): DungeonDoorDefinition {
  return {
    ...door,
    center: mirrorVector3OnZ(door.center),
    rotationY: -door.rotationY
  };
}

function getRoomChestPositionWithClearances(
  room: DungeonRoomNode,
  clearancePoints: ClearancePoint[]
): THREE.Vector3 | null {
  const bounds = getRoomWorldBounds(room);
  const minX = bounds.xMin + CHEST_WALL_MARGIN;
  const maxX = bounds.xMax - CHEST_WALL_MARGIN;
  const minZ = bounds.zMin + CHEST_WALL_MARGIN;
  const maxZ = bounds.zMax - CHEST_WALL_MARGIN;

  if (minX > maxX || minZ > maxZ) {
    return null;
  }

  for (let attempt = 0; attempt < CHEST_POSITION_ATTEMPTS; attempt += 1) {
    const candidate = new THREE.Vector3(
      randomBetween(minX, maxX),
      0,
      randomBetween(minZ, maxZ)
    );

    if (isChestPositionClear(candidate, clearancePoints)) {
      return candidate;
    }
  }

  for (let z = minZ; z <= maxZ + 0.0001; z += CHEST_POSITION_GRID_STEP) {
    for (let x = minX; x <= maxX + 0.0001; x += CHEST_POSITION_GRID_STEP) {
      const candidate = new THREE.Vector3(Math.min(x, maxX), 0, Math.min(z, maxZ));
      if (isChestPositionClear(candidate, clearancePoints)) {
        return candidate;
      }
    }
  }

  return null;
}

function isChestPositionClear(candidate: THREE.Vector3, clearancePoints: ClearancePoint[]): boolean {
  return clearancePoints.every((point) => candidate.distanceTo(point.position) >= point.minDistance);
}

function getRoomDoorClearancePoints(
  room: DungeonRoomNode,
  roomDoorCenters: Map<string, THREE.Vector3[]>
): ClearancePoint[] {
  const doorCenters = roomDoorCenters.get(room.id) ?? [];
  return doorCenters.map((position) => ({
    position,
    minDistance: CHEST_DOOR_CLEARANCE
  }));
}

function pickChestPlacementWithinZone(
  graph: DungeonGraph,
  roomById: Map<string, DungeonRoomNode>,
  zoneId: Exclude<DungeonZoneId, 'spawn' | 'boss'>,
  roomDoorCenters: Map<string, THREE.Vector3[]>,
  extraClearancePoints: ClearancePoint[],
  errorMessage: string
): { room: DungeonRoomNode; position: THREE.Vector3 } {
  const candidates = graph.rooms
    .map((room) => roomById.get(room.id))
    .filter((room): room is DungeonRoomNode => Boolean(room))
    .filter((room) => room.zoneId === zoneId);

  if (candidates.length === 0) {
    throw new Error(errorMessage);
  }

  for (const room of shuffleArray(candidates)) {
    const position = getRoomChestPositionWithClearances(room, [
      ...getRoomDoorClearancePoints(room, roomDoorCenters),
      ...extraClearancePoints
    ]);
    if (position) {
      return { room, position };
    }
  }

  throw new Error(errorMessage);
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
  const epsilon = 0.0001;
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

  const groups = new Map<string, DungeonWallSegment[]>();
  for (const segment of unique) {
    const key = [
      segment.axis,
      segment.line.toFixed(4),
      segment.center.y.toFixed(4),
      segment.size.y.toFixed(4),
      segment.affectsJoins ? 'joins' : 'frame'
    ].join('|');
    const group = groups.get(key) ?? [];
    group.push(segment);
    groups.set(key, group);
  }

  const merged: DungeonWallSegment[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => getSegmentRangeStart(a) - getSegmentRangeStart(b));
    let current = sorted[0];

    for (let index = 1; index < sorted.length; index += 1) {
      const candidate = sorted[index];
      if (getSegmentRangeStart(candidate) <= getSegmentRangeEnd(current) + epsilon) {
        current = mergeWallSegments(current, candidate);
        continue;
      }

      merged.push(current);
      current = candidate;
    }

    merged.push(current);
  }

  return merged;
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



function getRequiredDoor(doors: DungeonDoorDefinition[], itemId: string): DungeonDoorDefinition {
  const door = doors.find((candidate) => candidate.requiredItemId === itemId);
  if (!door) {
    throw new Error('Missing required door for item: ' + itemId);
  }

  return door;
}


function createCorridorTransitions(
  corridor: DungeonCorridorEdge,
  fromRoom: DungeonRoomNode,
  toRoom: DungeonRoomNode
): CorridorTransition[] {
  const fromBounds = getRoomWorldBounds(fromRoom);
  const toBounds = getRoomWorldBounds(toRoom);
  const corridorRect = getCorridorRect(fromRoom, toRoom, corridor);
  const corridorRequiredItemId = getCorridorRequiredItemId(corridor.id);
  const corridorDoorName = getCorridorDoorName(corridor.id);
  const isSpawnEntrance = corridor.id === ENTRANCE_DOOR_CORRIDOR_ID;

  if (corridor.axis === 'z') {
    const xCenter = (corridorRect.xMin + corridorRect.xMax) / 2;
    const lowerRoom = fromBounds.zMin < toBounds.zMin ? fromRoom : toRoom;
    const upperRoom = lowerRoom.id === fromRoom.id ? toRoom : fromRoom;
    const lowerBounds = lowerRoom.id === fromRoom.id ? fromBounds : toBounds;
    const upperBounds = upperRoom.id === toRoom.id ? toBounds : fromBounds;

    if (isSpawnEntrance) {
      const spawnRoom = lowerRoom.type === 'spawn' ? lowerRoom : upperRoom;
      const spawnBounds = spawnRoom.id === lowerRoom.id ? lowerBounds : upperBounds;
      return validateDoorTransitions([
        {
          roomId: spawnRoom.id,
          center: new THREE.Vector3(xCenter, 0, spawnBounds.zMax),
          rotationY: 0,
          openingStart: corridorRect.xMin,
          openingEnd: corridorRect.xMax,
          wallStart: spawnBounds.xMin,
          wallEnd: spawnBounds.xMax,
          locked: true,
          entrance: true,
          requiredItemId: corridorRequiredItemId,
          doorName: corridorDoorName
        }
      ], corridor.id);
    }

    if (corridorRequiredItemId) {
      const anchorZoneId = getLockedDoorAnchorZoneId(corridor.id);
      const anchorRoom = lowerRoom.zoneId === anchorZoneId ? lowerRoom : upperRoom;
      const anchorBounds = anchorRoom.id === lowerRoom.id ? lowerBounds : upperBounds;
      return validateDoorTransitions([
        {
          roomId: anchorRoom.id,
          center: new THREE.Vector3(
            xCenter,
            0,
            anchorRoom.id === lowerRoom.id ? anchorBounds.zMax : anchorBounds.zMin
          ),
          rotationY: 0,
          openingStart: corridorRect.xMin,
          openingEnd: corridorRect.xMax,
          wallStart: anchorBounds.xMin,
          wallEnd: anchorBounds.xMax,
          locked: true,
          entrance: false,
          requiredItemId: corridorRequiredItemId,
          doorName: corridorDoorName
        }
      ], corridor.id);
    }

    return validateDoorTransitions([
      {
        roomId: lowerRoom.id,
        center: new THREE.Vector3(xCenter, 0, lowerBounds.zMax),
        rotationY: 0,
        openingStart: corridorRect.xMin,
        openingEnd: corridorRect.xMax,
        wallStart: lowerBounds.xMin,
        wallEnd: lowerBounds.xMax,
        locked: false,
        entrance: false,
        requiredItemId: undefined,
        doorName: corridorDoorName
      },
      {
        roomId: upperRoom.id,
        center: new THREE.Vector3(xCenter, 0, upperBounds.zMin),
        rotationY: 0,
        openingStart: corridorRect.xMin,
        openingEnd: corridorRect.xMax,
        wallStart: upperBounds.xMin,
        wallEnd: upperBounds.xMax,
        locked: false,
        entrance: false,
        requiredItemId: undefined,
        doorName: corridorDoorName
      }
    ], corridor.id);
  }

  const zCenter = (corridorRect.zMin + corridorRect.zMax) / 2;
  const leftRoom = fromBounds.xMin < toBounds.xMin ? fromRoom : toRoom;
  const rightRoom = leftRoom.id === fromRoom.id ? toRoom : fromRoom;
  const leftBounds = leftRoom.id === fromRoom.id ? fromBounds : toBounds;
  const rightBounds = rightRoom.id === toRoom.id ? toBounds : fromBounds;

  if (corridorRequiredItemId) {
    const anchorZoneId = getLockedDoorAnchorZoneId(corridor.id);
    const anchorRoom = leftRoom.zoneId === anchorZoneId ? leftRoom : rightRoom;
    const anchorBounds = anchorRoom.id === leftRoom.id ? leftBounds : rightBounds;
    return validateDoorTransitions([
      {
        roomId: anchorRoom.id,
        center: new THREE.Vector3(
          anchorRoom.id === leftRoom.id ? anchorBounds.xMax : anchorBounds.xMin,
          0,
          zCenter
        ),
        rotationY: Math.PI / 2,
        openingStart: corridorRect.zMin,
        openingEnd: corridorRect.zMax,
        wallStart: anchorBounds.zMin,
        wallEnd: anchorBounds.zMax,
        locked: true,
        entrance: false,
        requiredItemId: corridorRequiredItemId,
        doorName: corridorDoorName
      }
    ], corridor.id);
  }

  return validateDoorTransitions([
    {
      roomId: leftRoom.id,
      center: new THREE.Vector3(leftBounds.xMax, 0, zCenter),
      rotationY: Math.PI / 2,
      openingStart: corridorRect.zMin,
      openingEnd: corridorRect.zMax,
      wallStart: leftBounds.zMin,
      wallEnd: leftBounds.zMax,
      locked: false,
      entrance: false,
      requiredItemId: undefined,
      doorName: corridorDoorName
    },
    {
      roomId: rightRoom.id,
      center: new THREE.Vector3(rightBounds.xMin, 0, zCenter),
      rotationY: Math.PI / 2,
      openingStart: corridorRect.zMin,
      openingEnd: corridorRect.zMax,
      wallStart: rightBounds.zMin,
      wallEnd: rightBounds.zMax,
      locked: false,
      entrance: false,
      requiredItemId: undefined,
      doorName: corridorDoorName
    }
  ], corridor.id);
}

function validateDoorTransitions(
  transitions: CorridorTransition[],
  corridorId: string
): CorridorTransition[] {
  for (const transition of transitions) {
    const usableStart = Math.max(transition.openingStart, transition.wallStart);
    const usableEnd = Math.min(transition.openingEnd, transition.wallEnd);
    if (usableEnd - usableStart < DOOR_WIDTH) {
      throw new Error(`Door opening in ${corridorId} is too narrow.`);
    }
  }

  return transitions;
}

function getCorridorRequiredItemId(corridorId: string): string | undefined {
  if (corridorId === ENTRANCE_DOOR_CORRIDOR_ID) {
    return 'rusty_key';
  }

  if (corridorId === BRONZE_DOOR_CORRIDOR_ID) {
    return 'bronze_key';
  }

  if (corridorId === SILVER_DOOR_CORRIDOR_ID) {
    return 'silver_key';
  }

  if (corridorId === GOLD_DOOR_CORRIDOR_ID) {
    return 'gold_key';
  }

  return undefined;
}

function getLockedDoorAnchorZoneId(corridorId: string): Exclude<DungeonZoneId, 'spawn' | 'boss'> {
  if (corridorId === BRONZE_DOOR_CORRIDOR_ID) {
    return BRONZE_ZONE_ID;
  }

  if (corridorId === SILVER_DOOR_CORRIDOR_ID) {
    return SILVER_ZONE_ID;
  }

  if (corridorId === GOLD_DOOR_CORRIDOR_ID) {
    return GOLD_ZONE_ID;
  }

  throw new Error('Missing anchor room for locked corridor: ' + corridorId);
}

function getDoorRequiredItemId(corridorId: string, roomId: string): string | undefined {
  void corridorId;
  void roomId;
  return undefined;
}

function getCorridorDoorName(corridorId: string): string | undefined {
  if (corridorId === ENTRANCE_DOOR_CORRIDOR_ID) {
    return "porte d'entrée";
  }

  if (corridorId === BRONZE_DOOR_CORRIDOR_ID) {
    return 'porte de bronze';
  }

  if (corridorId === SILVER_DOOR_CORRIDOR_ID) {
    return "porte d'argent";
  }

  if (corridorId === GOLD_DOOR_CORRIDOR_ID) {
    return "porte d'or";
  }

  return undefined;
}

function createInteriorDoor(transition: CorridorTransition, index: number): DungeonDoorDefinition {
  const doorId = transition.requiredItemId
    ? `${transition.requiredItemId}_${transition.roomId}`
    : `interior_door_${index}`;
  const { center } = getDoorOpeningRange(transition);

  return {
    id: doorId,
    center,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    depth: DOOR_DEPTH,
    rotationY: transition.rotationY,
    obstacleId: transition.requiredItemId
      ? `door_obstacle_${transition.requiredItemId}_${transition.roomId}`
      : `door_obstacle_interior_${index}`,
    locked: transition.locked,
    entrance: transition.entrance,
    requiredItemId: transition.requiredItemId,
    doorName: transition.doorName
  };
}

function getDoorOpeningRange(transition: CorridorTransition): {
  center: THREE.Vector3;
  start: number;
  end: number;
} {
  const usableStart = Math.max(transition.openingStart, transition.wallStart);
  const usableEnd = Math.min(transition.openingEnd, transition.wallEnd);
  const openingCenter = (usableStart + usableEnd) / 2;

  if (Math.abs(Math.sin(transition.rotationY)) < 0.5) {
    return {
      center: new THREE.Vector3(openingCenter, transition.center.y, transition.center.z),
      start: openingCenter - DOOR_WIDTH / 2,
      end: openingCenter + DOOR_WIDTH / 2
    };
  }

  return {
    center: new THREE.Vector3(transition.center.x, transition.center.y, openingCenter),
    start: openingCenter - DOOR_WIDTH / 2,
    end: openingCenter + DOOR_WIDTH / 2
  };
}

function addDoorFrameSegments(
  segments: DungeonWallSegment[],
  placements: DoorTransitionPlacement[]
): void {
  const epsilon = 0.0001;
  const groups = new Map<string, DoorOpening[]>();

  for (const opening of placements.map(getDoorOpeningFromPlacement)) {
    const key = [
      opening.axis,
      opening.line.toFixed(4),
      opening.placement.transition.wallStart.toFixed(4),
      opening.placement.transition.wallEnd.toFixed(4)
    ].join('|');
    const group = groups.get(key) ?? [];
    group.push(opening);
    groups.set(key, group);
  }

  let frameId = 0;
  for (const openings of groups.values()) {
    const first = openings[0];
    const wallStart = first.placement.transition.wallStart;
    const wallEnd = first.placement.transition.wallEnd;
    const sorted = openings
      .map((opening) => ({
        ...opening,
        start: Math.max(opening.start, wallStart),
        end: Math.min(opening.end, wallEnd)
      }))
      .filter((opening) => opening.end - opening.start > epsilon)
      .sort((a, b) => a.start - b.start);

    let cursor = wallStart;
    for (const opening of sorted) {
      if (opening.start > cursor + epsilon) {
        replaceStructuralRangeWithFrame(
          segments,
          createFrameWallSegment(first.axis, first.line, cursor, opening.start, frameId)
        );
        frameId += 1;
      }

      cursor = Math.max(cursor, opening.end);
    }

    for (const opening of sorted) {
      clearStructuralWallRange(segments, opening.axis, opening.line, opening.start, opening.end);
    }

    if (cursor < wallEnd - epsilon) {
      replaceStructuralRangeWithFrame(
        segments,
        createFrameWallSegment(first.axis, first.line, cursor, wallEnd, frameId)
      );
      frameId += 1;
    }
  }
}

function getDoorOpeningFromPlacement(placement: DoorTransitionPlacement): DoorOpening {
  const { start, end } = getDoorOpeningRange(placement.transition);
  const axis = Math.abs(Math.sin(placement.transition.rotationY)) < 0.5 ? 'x' : 'z';
  return {
    placement,
    axis,
    line: axis === 'x' ? placement.transition.center.z : placement.transition.center.x,
    start,
    end
  };
}

function createFrameWallSegment(
  axis: 'x' | 'z',
  line: number,
  start: number,
  end: number,
  index: number
): DungeonWallSegment {
  if (axis === 'x') {
    return frameHorizontalWall(`interior_door_frame_${index}`, start, end, line);
  }

  return frameVerticalWall(`interior_door_frame_${index}`, line, start, end);
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

function clearStructuralWallRange(
  segments: DungeonWallSegment[],
  axis: 'x' | 'z',
  line: number,
  rangeStart: number,
  rangeEnd: number
): void {
  const epsilon = 0.0001;

  for (let index = 0; index < segments.length; index += 1) {
    const candidate = segments[index];
    if (!candidate.affectsJoins || candidate.axis !== axis || Math.abs(candidate.line - line) > epsilon) {
      continue;
    }

    const candidateStart = getSegmentRangeStart(candidate);
    const candidateEnd = getSegmentRangeEnd(candidate);
    const overlapStart = Math.max(candidateStart, rangeStart);
    const overlapEnd = Math.min(candidateEnd, rangeEnd);

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

function mergeWallSegments(a: DungeonWallSegment, b: DungeonWallSegment): DungeonWallSegment {
  const start = Math.min(getSegmentRangeStart(a), getSegmentRangeStart(b));
  const end = Math.max(getSegmentRangeEnd(a), getSegmentRangeEnd(b));
  const affectsJoins = a.affectsJoins || b.affectsJoins;

  if (a.axis === 'x') {
    const merged = affectsJoins ? horizontalWall(a.id, start, end, a.line) : frameHorizontalWall(a.id, start, end, a.line);
    return {
      ...merged,
      priority: Math.min(a.priority, b.priority)
    };
  }

  const merged = affectsJoins ? verticalWall(a.id, a.line, start, end) : frameVerticalWall(a.id, a.line, start, end);
  return {
    ...merged,
    priority: Math.min(a.priority, b.priority)
  };
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
