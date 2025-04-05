import { useState, useCallback, useEffect } from 'react';
import { 
  UnitType, 
  BuildingType, 
  ResourceType,
  INITIAL_MONEY,
  INITIAL_POWER,
  UNIT_COSTS,
  BUILDING_COSTS,
  UNIT_PROPERTIES,
  BUILDING_PROPERTIES
} from '../../lib/game/constants';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  position: Position;
  health: number;
  selected: boolean;
  targetPosition?: Position;
  targetUnit?: string;
  targetBuilding?: string;
  targetResource?: string;
  isHarvesting?: boolean;
  carryingResource?: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Position;
  size: Size;
  health: number;
  selected: boolean;
  constructionProgress?: number;
}

export interface Resource {
  id: string;
  type: ResourceType.MONEY;
  position: Position;
  amount: number;
}

export interface GameState {
  units: Unit[];
  buildings: Building[];
  resources: {
    money: number;
    power: number;
  };
  resourceNodes: Resource[];
  selectedUnit: Unit | null;
  selectedBuilding: Building | null;
  placingBuilding: {
    type: BuildingType;
    valid: boolean;
  } | null;
}

const initialState: GameState = {
  units: [
    {
      id: 'unit-1',
      type: UnitType.HARVESTER,
      position: { x: 5, y: 5 },
      health: UNIT_PROPERTIES[UnitType.HARVESTER].health,
      selected: false,
    },
    {
      id: 'unit-2',
      type: UnitType.TANK,
      position: { x: 7, y: 5 },
      health: UNIT_PROPERTIES[UnitType.TANK].health,
      selected: false,
    },
  ],
  buildings: [
    {
      id: 'building-1',
      type: BuildingType.COMMAND_CENTER,
      position: { x: 10, y: 10 },
      size: BUILDING_PROPERTIES[BuildingType.COMMAND_CENTER].size,
      health: BUILDING_PROPERTIES[BuildingType.COMMAND_CENTER].health,
      selected: false,
    },
  ],
  resources: {
    money: INITIAL_MONEY,
    power: INITIAL_POWER,
  },
  resourceNodes: [
    {
      id: 'resource-1',
      type: ResourceType.MONEY,
      position: { x: 15, y: 5 },
      amount: 5000,
    },
    {
      id: 'resource-2',
      type: ResourceType.MONEY,
      position: { x: 20, y: 15 },
      amount: 5000,
    },
  ],
  selectedUnit: null,
  selectedBuilding: null,
  placingBuilding: null,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const selectUnit = useCallback((unitId: string | null) => {
    setGameState(prev => {
      const updatedUnits = prev.units.map(unit => ({
        ...unit,
        selected: unit.id === unitId,
      }));
      
      const updatedBuildings = prev.buildings.map(building => ({
        ...building,
        selected: false,
      }));
      
      const selectedUnit = unitId ? updatedUnits.find(unit => unit.id === unitId) || null : null;
      
      return {
        ...prev,
        units: updatedUnits,
        buildings: updatedBuildings,
        selectedUnit,
        selectedBuilding: null,
      };
    });
  }, []);

  const selectBuilding = useCallback((buildingId: string | null) => {
    setGameState(prev => {
      const updatedUnits = prev.units.map(unit => ({
        ...unit,
        selected: false,
      }));
      
      const updatedBuildings = prev.buildings.map(building => ({
        ...building,
        selected: building.id === buildingId,
      }));
      
      const selectedBuilding = buildingId ? updatedBuildings.find(building => building.id === buildingId) || null : null;
      
      return {
        ...prev,
        units: updatedUnits,
        buildings: updatedBuildings,
        selectedUnit: null,
        selectedBuilding,
      };
    });
  }, []);

  const startPlacingBuilding = useCallback((buildingType: BuildingType) => {
    const cost = BUILDING_COSTS[buildingType][ResourceType.MONEY];
    
    if (gameState.resources.money >= cost) {
      setGameState(prev => ({
        ...prev,
        placingBuilding: {
          type: buildingType,
          valid: true,
        },
      }));
    }
  }, [gameState.resources.money]);

  const buildStructure = useCallback((buildingType: BuildingType, position: Position) => {
    const cost = BUILDING_COSTS[buildingType][ResourceType.MONEY];
    const buildingSize = BUILDING_PROPERTIES[buildingType].size;
    
    if (gameState.resources.money >= cost) {
      const newBuilding: Building = {
        id: `building-${Date.now()}`,
        type: buildingType,
        position,
        size: buildingSize,
        health: BUILDING_PROPERTIES[buildingType].health,
        selected: false,
        constructionProgress: 0,
      };
      
      setGameState(prev => ({
        ...prev,
        buildings: [...prev.buildings, newBuilding],
        resources: {
          ...prev.resources,
          money: prev.resources.money - cost,
        },
        placingBuilding: null,
      }));
    }
  }, [gameState.resources.money]);

  const createUnit = useCallback((unitType: UnitType, buildingId: string) => {
    const cost = UNIT_COSTS[unitType][ResourceType.MONEY];
    
    if (gameState.resources.money >= cost) {
      const building = gameState.buildings.find(b => b.id === buildingId);
      
      if (building) {
        const spawnPosition = {
          x: building.position.x + building.size.width,
          y: building.position.y + building.size.height,
        };
        
        const newUnit: Unit = {
          id: `unit-${Date.now()}`,
          type: unitType,
          position: spawnPosition,
          health: UNIT_PROPERTIES[unitType].health,
          selected: false,
        };
        
        setGameState(prev => ({
          ...prev,
          units: [...prev.units, newUnit],
          resources: {
            ...prev.resources,
            money: prev.resources.money - cost,
          },
        }));
      }
    }
  }, [gameState.resources.money, gameState.buildings]);

  const moveUnit = useCallback((unitId: string, targetPosition: Position) => {
    setGameState(prev => {
      const updatedUnits = prev.units.map(unit => {
        if (unit.id === unitId) {
          return {
            ...unit,
            targetPosition,
            targetUnit: undefined,
            targetBuilding: undefined,
            targetResource: undefined,
            isHarvesting: false,
          };
        }
        return unit;
      });
      
      return {
        ...prev,
        units: updatedUnits,
      };
    });
  }, []);

  const attackTarget = useCallback((unitId: string, targetId: string, isBuilding: boolean) => {
    setGameState(prev => {
      const updatedUnits = prev.units.map(unit => {
        if (unit.id === unitId) {
          if (isBuilding) {
            return {
              ...unit,
              targetBuilding: targetId,
              targetUnit: undefined,
              targetResource: undefined,
              isHarvesting: false,
            };
          } else {
            return {
              ...unit,
              targetUnit: targetId,
              targetBuilding: undefined,
              targetResource: undefined,
              isHarvesting: false,
            };
          }
        }
        return unit;
      });
      
      return {
        ...prev,
        units: updatedUnits,
      };
    });
  }, []);

  const harvestResource = useCallback((unitId: string, resourceId: string) => {
    setGameState(prev => {
      const updatedUnits = prev.units.map(unit => {
        if (unit.id === unitId && unit.type === UnitType.HARVESTER) {
          return {
            ...unit,
            targetResource: resourceId,
            targetUnit: undefined,
            targetBuilding: undefined,
            isHarvesting: true,
          };
        }
        return unit;
      });
      
      return {
        ...prev,
        units: updatedUnits,
      };
    });
  }, []);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdate) / 1000;
      setLastUpdate(now);
      
      setGameState(prev => {
        const updatedUnits = prev.units.map(unit => {
          let updatedUnit = { ...unit };
          
          if (unit.targetPosition) {
            const dx = unit.targetPosition.x - unit.position.x;
            const dy = unit.targetPosition.y - unit.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0.1) {
              const speed = UNIT_PROPERTIES[unit.type].speed * deltaTime;
              const ratio = Math.min(speed / distance, 1);
              
              updatedUnit = {
                ...updatedUnit,
                position: {
                  x: unit.position.x + dx * ratio,
                  y: unit.position.y + dy * ratio,
                },
              };
            } else {
              updatedUnit = {
                ...updatedUnit,
                targetPosition: undefined,
              };
            }
          }
          
          if (unit.isHarvesting && unit.targetResource) {
            const resource = prev.resourceNodes.find(r => r.id === unit.targetResource);
            
            if (resource) {
              const dx = resource.position.x - unit.position.x;
              const dy = resource.position.y - unit.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 1) {
                if (!unit.carryingResource) {
                  updatedUnit = {
                    ...updatedUnit,
                    carryingResource: Math.min(100, resource.amount),
                  };
                }
              }
            }
          }
          
          if (unit.carryingResource && unit.carryingResource > 0) {
            const commandCenter = prev.buildings.find(b => b.type === BuildingType.COMMAND_CENTER);
            
            if (commandCenter) {
              const dx = commandCenter.position.x - unit.position.x;
              const dy = commandCenter.position.y - unit.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 2) {
                return {
                  ...updatedUnit,
                  carryingResource: 0,
                };
              }
            }
          }
          
          return updatedUnit;
        });
        
        let updatedResources = { ...prev.resources };
        let updatedResourceNodes = [...prev.resourceNodes];
        
        updatedUnits.forEach(unit => {
          if (unit.type === UnitType.HARVESTER && unit.carryingResource === 0) {
            const prevUnit = prev.units.find(u => u.id === unit.id);
            
            if (prevUnit && prevUnit.carryingResource && prevUnit.carryingResource > 0) {
              updatedResources.money += prevUnit.carryingResource;
              
              if (prevUnit.targetResource) {
                updatedResourceNodes = updatedResourceNodes.map(node => {
                  if (node.id === prevUnit.targetResource) {
                    return {
                      ...node,
                      amount: Math.max(0, node.amount - (prevUnit.carryingResource || 0)),
                    };
                  }
                  return node;
                });
              }
            }
          }
        });
        
        const updatedBuildings = prev.buildings.map(building => {
          if (building.constructionProgress !== undefined && building.constructionProgress < 100) {
            return {
              ...building,
              constructionProgress: Math.min(100, building.constructionProgress + 10 * deltaTime),
            };
          }
          return building;
        });
        
        return {
          ...prev,
          units: updatedUnits,
          buildings: updatedBuildings,
          resources: updatedResources,
          resourceNodes: updatedResourceNodes,
        };
      });
    }, 100); // Update 10 times per second
    
    return () => clearInterval(gameLoop);
  }, [lastUpdate]);

  return {
    gameState,
    selectUnit,
    selectBuilding,
    startPlacingBuilding,
    buildStructure,
    createUnit,
    moveUnit,
    attackTarget,
    harvestResource,
  };
};
