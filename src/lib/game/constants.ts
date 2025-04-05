
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 20;

export const GAME_SPEED = 1;
export const INITIAL_MONEY = 5000;
export const INITIAL_POWER = 100;

export enum UnitType {
  HARVESTER = 'harvester',
  TANK = 'tank',
  INFANTRY = 'infantry',
}

export enum BuildingType {
  COMMAND_CENTER = 'commandCenter',
  BARRACKS = 'barracks',
  POWER_PLANT = 'powerPlant',
  WAR_FACTORY = 'warFactory',
  REFINERY = 'refinery',
}

export enum ResourceType {
  MONEY = 'money',
  POWER = 'power',
}

export const UNIT_COSTS = {
  [UnitType.HARVESTER]: { [ResourceType.MONEY]: 1500 },
  [UnitType.TANK]: { [ResourceType.MONEY]: 1000 },
  [UnitType.INFANTRY]: { [ResourceType.MONEY]: 500 },
};

export const BUILDING_COSTS = {
  [BuildingType.COMMAND_CENTER]: { [ResourceType.MONEY]: 5000 },
  [BuildingType.BARRACKS]: { [ResourceType.MONEY]: 2000 },
  [BuildingType.POWER_PLANT]: { [ResourceType.MONEY]: 1500 },
  [BuildingType.WAR_FACTORY]: { [ResourceType.MONEY]: 2500 },
  [BuildingType.REFINERY]: { [ResourceType.MONEY]: 3000 },
};

export const UNIT_PROPERTIES = {
  [UnitType.HARVESTER]: {
    health: 100,
    speed: 1,
    attackPower: 0,
    range: 0,
    harvestAmount: 100,
  },
  [UnitType.TANK]: {
    health: 200,
    speed: 1.5,
    attackPower: 50,
    range: 4,
  },
  [UnitType.INFANTRY]: {
    health: 50,
    speed: 2,
    attackPower: 20,
    range: 3,
  },
};

export const BUILDING_PROPERTIES = {
  [BuildingType.COMMAND_CENTER]: {
    health: 1000,
    powerUsage: 20,
    size: { width: 3, height: 3 },
  },
  [BuildingType.BARRACKS]: {
    health: 500,
    powerUsage: 10,
    size: { width: 2, height: 2 },
  },
  [BuildingType.POWER_PLANT]: {
    health: 300,
    powerProduction: 50,
    size: { width: 2, height: 2 },
  },
  [BuildingType.WAR_FACTORY]: {
    health: 600,
    powerUsage: 15,
    size: { width: 3, height: 2 },
  },
  [BuildingType.REFINERY]: {
    health: 400,
    powerUsage: 10,
    size: { width: 2, height: 3 },
  },
};

export const COLORS = {
  PLAYER: '#3498db',
  ENEMY: '#e74c3c',
  NEUTRAL: '#95a5a6',
  SELECTED: '#2ecc71',
  GRID: '#ecf0f1',
  RESOURCE: '#f1c40f',
};
