import React from 'react';
import { 
  BuildingType, 
  UnitType, 
  BUILDING_COSTS, 
  UNIT_COSTS, 
  ResourceType 
} from '../../lib/game/constants';
import { GameState, Position } from '../../hooks/game/useGameState';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface GameUIProps {
  gameState: GameState;
  onBuildStructure: (buildingType: BuildingType, position: Position) => void;
  onCreateUnit: (unitType: UnitType, buildingId: string) => void;
}

const GameUI: React.FC<GameUIProps> = ({ gameState, onBuildStructure, onCreateUnit }) => {
  const { selectedUnit, selectedBuilding } = gameState;
  
  const handleBuildStructure = (buildingType: BuildingType) => {
    const position = { x: 15, y: 15 };
    onBuildStructure(buildingType, position);
  };
  
  const handleCreateUnit = (unitType: UnitType) => {
    if (selectedBuilding) {
      onCreateUnit(unitType, selectedBuilding.id);
    }
  };
  
  const canAfford = (cost: number) => {
    return gameState.resources.money >= cost;
  };
  
  return (
    <div className="game-ui w-64 bg-gray-100 p-4 flex flex-col h-full overflow-y-auto">
      <div className="resource-panel mb-4">
        <h2 className="text-lg font-bold mb-2">资源</h2>
        <div className="flex justify-between">
          <div className="resource">
            <span className="font-bold">金钱:</span> {gameState.resources.money}
          </div>
          <div className="resource">
            <span className="font-bold">电力:</span> {gameState.resources.power}
          </div>
        </div>
      </div>
      
      <Separator className="my-2" />
      
      <Tabs defaultValue="build" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="build">建造</TabsTrigger>
          <TabsTrigger value="units">单位</TabsTrigger>
        </TabsList>
        
        <TabsContent value="build" className="space-y-2">
          <h3 className="text-md font-bold">建筑</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={canAfford(BUILDING_COSTS[BuildingType.COMMAND_CENTER][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleBuildStructure(BuildingType.COMMAND_CENTER)}
              disabled={!canAfford(BUILDING_COSTS[BuildingType.COMMAND_CENTER][ResourceType.MONEY])}
              className="justify-start"
            >
              指挥中心 ({BUILDING_COSTS[BuildingType.COMMAND_CENTER][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(BUILDING_COSTS[BuildingType.BARRACKS][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleBuildStructure(BuildingType.BARRACKS)}
              disabled={!canAfford(BUILDING_COSTS[BuildingType.BARRACKS][ResourceType.MONEY])}
              className="justify-start"
            >
              兵营 ({BUILDING_COSTS[BuildingType.BARRACKS][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(BUILDING_COSTS[BuildingType.POWER_PLANT][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleBuildStructure(BuildingType.POWER_PLANT)}
              disabled={!canAfford(BUILDING_COSTS[BuildingType.POWER_PLANT][ResourceType.MONEY])}
              className="justify-start"
            >
              发电厂 ({BUILDING_COSTS[BuildingType.POWER_PLANT][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(BUILDING_COSTS[BuildingType.WAR_FACTORY][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleBuildStructure(BuildingType.WAR_FACTORY)}
              disabled={!canAfford(BUILDING_COSTS[BuildingType.WAR_FACTORY][ResourceType.MONEY])}
              className="justify-start"
            >
              战车工厂 ({BUILDING_COSTS[BuildingType.WAR_FACTORY][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(BUILDING_COSTS[BuildingType.REFINERY][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleBuildStructure(BuildingType.REFINERY)}
              disabled={!canAfford(BUILDING_COSTS[BuildingType.REFINERY][ResourceType.MONEY])}
              className="justify-start"
            >
              精炼厂 ({BUILDING_COSTS[BuildingType.REFINERY][ResourceType.MONEY]})
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="units" className="space-y-2">
          <h3 className="text-md font-bold">单位</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={canAfford(UNIT_COSTS[UnitType.HARVESTER][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleCreateUnit(UnitType.HARVESTER)}
              disabled={!selectedBuilding || !canAfford(UNIT_COSTS[UnitType.HARVESTER][ResourceType.MONEY])}
              className="justify-start"
            >
              采矿车 ({UNIT_COSTS[UnitType.HARVESTER][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(UNIT_COSTS[UnitType.TANK][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleCreateUnit(UnitType.TANK)}
              disabled={!selectedBuilding || !canAfford(UNIT_COSTS[UnitType.TANK][ResourceType.MONEY])}
              className="justify-start"
            >
              坦克 ({UNIT_COSTS[UnitType.TANK][ResourceType.MONEY]})
            </Button>
            
            <Button
              variant={canAfford(UNIT_COSTS[UnitType.INFANTRY][ResourceType.MONEY]) ? "default" : "outline"}
              onClick={() => handleCreateUnit(UnitType.INFANTRY)}
              disabled={!selectedBuilding || !canAfford(UNIT_COSTS[UnitType.INFANTRY][ResourceType.MONEY])}
              className="justify-start"
            >
              步兵 ({UNIT_COSTS[UnitType.INFANTRY][ResourceType.MONEY]})
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-2" />
      
      {/* Selected Unit/Building Info */}
      <div className="selection-info mt-auto">
        {selectedUnit && (
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-md">已选择单位</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p><span className="font-bold">类型:</span> {getUnitTypeName(selectedUnit.type)}</p>
              <p><span className="font-bold">生命值:</span> {selectedUnit.health}</p>
              <p><span className="font-bold">位置:</span> ({Math.floor(selectedUnit.position.x)}, {Math.floor(selectedUnit.position.y)})</p>
              {selectedUnit.type === UnitType.HARVESTER && (
                <p><span className="font-bold">资源:</span> {selectedUnit.carryingResource || 0}</p>
              )}
            </CardContent>
          </Card>
        )}
        
        {selectedBuilding && (
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-md">已选择建筑</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p><span className="font-bold">类型:</span> {getBuildingTypeName(selectedBuilding.type)}</p>
              <p><span className="font-bold">生命值:</span> {selectedBuilding.health}</p>
              <p><span className="font-bold">位置:</span> ({selectedBuilding.position.x}, {selectedBuilding.position.y})</p>
              {selectedBuilding.constructionProgress !== undefined && selectedBuilding.constructionProgress < 100 && (
                <p><span className="font-bold">建造进度:</span> {Math.floor(selectedBuilding.constructionProgress)}%</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="game-instructions mt-4">
        <h3 className="text-md font-bold mb-1">游戏说明</h3>
        <ul className="text-xs list-disc pl-4">
          <li>点击单位或建筑选择它们</li>
          <li>选择单位后，点击地图移动单位</li>
          <li>采矿车可以点击资源进行采集</li>
          <li>选择建筑后，可以在右侧面板生产单位</li>
          <li>使用右侧面板建造新建筑</li>
        </ul>
      </div>
    </div>
  );
};

const getUnitTypeName = (type: UnitType): string => {
  switch (type) {
    case UnitType.HARVESTER:
      return '采矿车';
    case UnitType.TANK:
      return '坦克';
    case UnitType.INFANTRY:
      return '步兵';
    default:
      return '未知单位';
  }
};

const getBuildingTypeName = (type: BuildingType): string => {
  switch (type) {
    case BuildingType.COMMAND_CENTER:
      return '指挥中心';
    case BuildingType.BARRACKS:
      return '兵营';
    case BuildingType.POWER_PLANT:
      return '发电厂';
    case BuildingType.WAR_FACTORY:
      return '战车工厂';
    case BuildingType.REFINERY:
      return '精炼厂';
    default:
      return '未知建筑';
  }
};

export default GameUI;
