import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRID_SIZE, 
  COLORS,
  UnitType,
  BuildingType,
  BUILDING_PROPERTIES
} from '../../lib/game/constants';
import { GameState, Position, Unit, Building, Resource } from '../../hooks/game/useGameState';

interface GameCanvasProps {
  gameState: GameState;
  onUnitSelect: (unitId: string | null) => void;
  onBuildingSelect: (buildingId: string | null) => void;
  onUnitMove: (unitId: string, targetPosition: Position) => void;
  onAttack: (unitId: string, targetId: string, isBuilding: boolean) => void;
  onHarvest: (unitId: string, resourceId: string) => void;
}

const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ gameState, onUnitSelect, onBuildingSelect, onUnitMove, onAttack, onHarvest }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);
    
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawGrid(ctx);
      
      gameState.resourceNodes.forEach(resource => {
        drawResource(ctx, resource);
      });
      
      gameState.buildings.forEach(building => {
        drawBuilding(ctx, building);
      });
      
      gameState.units.forEach(unit => {
        drawUnit(ctx, unit);
      });
      
    }, [gameState]);
    
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
      const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);
      
      const clickedUnit = gameState.units.find(unit => {
        const unitX = Math.floor(unit.position.x);
        const unitY = Math.floor(unit.position.y);
        return x === unitX && y === unitY;
      });
      
      if (clickedUnit) {
        onUnitSelect(clickedUnit.id);
        return;
      }
      
      const clickedBuilding = gameState.buildings.find(building => {
        const buildingX = Math.floor(building.position.x);
        const buildingY = Math.floor(building.position.y);
        const buildingWidth = building.size.width;
        const buildingHeight = building.size.height;
        
        return (
          x >= buildingX && 
          x < buildingX + buildingWidth && 
          y >= buildingY && 
          y < buildingY + buildingHeight
        );
      });
      
      if (clickedBuilding) {
        onBuildingSelect(clickedBuilding.id);
        return;
      }
      
      if (gameState.selectedUnit) {
        const clickedResource = gameState.resourceNodes.find(resource => {
          const resourceX = Math.floor(resource.position.x);
          const resourceY = Math.floor(resource.position.y);
          return Math.abs(x - resourceX) <= 1 && Math.abs(y - resourceY) <= 1;
        });
        
        if (clickedResource && gameState.selectedUnit.type === UnitType.HARVESTER) {
          onHarvest(gameState.selectedUnit.id, clickedResource.id);
        } else {
          const enemyUnit = gameState.units.find(unit => {
            const unitX = Math.floor(unit.position.x);
            const unitY = Math.floor(unit.position.y);
            return x === unitX && y === unitY && unit.id !== gameState.selectedUnit?.id;
          });
          
          if (enemyUnit) {
            onAttack(gameState.selectedUnit.id, enemyUnit.id, false);
          } else {
            const enemyBuilding = gameState.buildings.find(building => {
              const buildingX = Math.floor(building.position.x);
              const buildingY = Math.floor(building.position.y);
              const buildingWidth = building.size.width;
              const buildingHeight = building.size.height;
              
              return (
                x >= buildingX && 
                x < buildingX + buildingWidth && 
                y >= buildingY && 
                y < buildingY + buildingHeight
              );
            });
            
            if (enemyBuilding) {
              onAttack(gameState.selectedUnit.id, enemyBuilding.id, true);
            } else {
              onUnitMove(gameState.selectedUnit.id, { x, y });
            }
          }
        }
      } else {
        onUnitSelect(null);
        onBuildingSelect(null);
      }
    };
    
    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = COLORS.GRID;
      ctx.lineWidth = 0.5;
      
      for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    };
    
    const drawUnit = (ctx: CanvasRenderingContext2D, unit: Unit) => {
      const x = unit.position.x * GRID_SIZE;
      const y = unit.position.y * GRID_SIZE;
      
      ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      
      switch (unit.type) {
        case UnitType.HARVESTER:
          ctx.fillRect(x - GRID_SIZE/2, y - GRID_SIZE/2, GRID_SIZE, GRID_SIZE);
          ctx.strokeRect(x - GRID_SIZE/2, y - GRID_SIZE/2, GRID_SIZE, GRID_SIZE);
          
          ctx.beginPath();
          ctx.arc(x, y - GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          if (unit.carryingResource && unit.carryingResource > 0) {
            ctx.fillStyle = COLORS.RESOURCE;
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/3, y - GRID_SIZE/3, GRID_SIZE/5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
          
        case UnitType.TANK:
          ctx.fillRect(x - GRID_SIZE/2, y - GRID_SIZE/3, GRID_SIZE, GRID_SIZE * 2/3);
          ctx.strokeRect(x - GRID_SIZE/2, y - GRID_SIZE/3, GRID_SIZE, GRID_SIZE * 2/3);
          
          ctx.fillRect(x - GRID_SIZE/4, y - GRID_SIZE/2, GRID_SIZE/2, GRID_SIZE/3);
          ctx.strokeRect(x - GRID_SIZE/4, y - GRID_SIZE/2, GRID_SIZE/2, GRID_SIZE/3);
          
          ctx.fillRect(x, y - GRID_SIZE/2 + GRID_SIZE/6, GRID_SIZE/2, GRID_SIZE/6);
          ctx.strokeRect(x, y - GRID_SIZE/2 + GRID_SIZE/6, GRID_SIZE/2, GRID_SIZE/6);
          break;
          
        case UnitType.INFANTRY:
          ctx.beginPath();
          ctx.arc(x, y - GRID_SIZE/3, GRID_SIZE/4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y - GRID_SIZE/6);
          ctx.lineTo(x - GRID_SIZE/3, y + GRID_SIZE/3);
          ctx.lineTo(x + GRID_SIZE/3, y + GRID_SIZE/3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
      }
      
      const healthPercent = unit.health / 100;
      const healthBarWidth = GRID_SIZE;
      const healthBarHeight = GRID_SIZE / 8;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(x - healthBarWidth/2, y + GRID_SIZE/2, healthBarWidth, healthBarHeight);
      
      ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
      ctx.fillRect(x - healthBarWidth/2, y + GRID_SIZE/2, healthBarWidth * healthPercent, healthBarHeight);
    };
    
    const drawBuilding = (ctx: CanvasRenderingContext2D, building: Building) => {
      const x = building.position.x * GRID_SIZE;
      const y = building.position.y * GRID_SIZE;
      const width = building.size.width * GRID_SIZE;
      const height = building.size.height * GRID_SIZE;
      
      ctx.fillStyle = building.selected ? COLORS.SELECTED : COLORS.PLAYER;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      
      switch (building.type) {
        case BuildingType.COMMAND_CENTER:
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width/2, y - height/4);
          ctx.lineTo(x + width, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.fillRect(x + width/2 - width/8, y + height - height/4, width/4, height/4);
          break;
          
        case BuildingType.BARRACKS:
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
          
          ctx.fillStyle = '#000';
          const windowSize = GRID_SIZE / 3;
          const windowSpacing = GRID_SIZE / 2;
          
          for (let wx = x + windowSpacing; wx < x + width - windowSize; wx += windowSpacing) {
            for (let wy = y + windowSpacing; wy < y + height - windowSize; wy += windowSpacing) {
              ctx.fillRect(wx, wy, windowSize, windowSize);
            }
          }
          break;
          
        case BuildingType.POWER_PLANT:
          ctx.fillRect(x, y, width, height * 0.7);
          ctx.strokeRect(x, y, width, height * 0.7);
          
          const cylinderCount = 2;
          const cylinderWidth = width / cylinderCount;
          
          for (let i = 0; i < cylinderCount; i++) {
            const cx = x + i * cylinderWidth + cylinderWidth/2;
            const cy = y + height * 0.7;
            
            ctx.fillRect(cx - cylinderWidth/3, cy - height * 0.2, cylinderWidth/1.5, height * 0.5);
            ctx.strokeRect(cx - cylinderWidth/3, cy - height * 0.2, cylinderWidth/1.5, height * 0.5);
            
            ctx.beginPath();
            ctx.ellipse(cx, cy - height * 0.2, cylinderWidth/3, cylinderWidth/6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          break;
          
        case BuildingType.WAR_FACTORY:
          ctx.fillRect(x, y + height/4, width, height * 3/4);
          ctx.strokeRect(x, y + height/4, width, height * 3/4);
          
          ctx.beginPath();
          ctx.moveTo(x, y + height/4);
          ctx.lineTo(x + width/6, y);
          ctx.lineTo(x + width - width/6, y);
          ctx.lineTo(x + width, y + height/4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.fillRect(x + width/2 - width/6, y + height - height/3, width/3, height/3);
          break;
          
        case BuildingType.REFINERY:
          ctx.fillRect(x, y, width, height * 0.6);
          ctx.strokeRect(x, y, width, height * 0.6);
          
          const siloCount = 2;
          const siloWidth = width / siloCount;
          
          for (let i = 0; i < siloCount; i++) {
            const sx = x + i * siloWidth + siloWidth/2;
            const sy = y + height * 0.6;
            
            ctx.beginPath();
            ctx.arc(sx, sy, siloWidth/2, 0, Math.PI, true);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillRect(sx - siloWidth/2, sy, siloWidth, height * 0.4);
            ctx.strokeRect(sx - siloWidth/2, sy, siloWidth, height * 0.4);
          }
          break;
      }
      
      if (building.constructionProgress !== undefined && building.constructionProgress < 100) {
        const progressPercent = building.constructionProgress / 100;
        const progressBarWidth = width;
        const progressBarHeight = GRID_SIZE / 6;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y - progressBarHeight - 2, progressBarWidth, progressBarHeight);
        
        ctx.fillStyle = '#0f0';
        ctx.fillRect(x, y - progressBarHeight - 2, progressBarWidth * progressPercent, progressBarHeight);
      }
      
      const healthPercent = building.health / BUILDING_PROPERTIES[building.type].health;
      const healthBarWidth = width;
      const healthBarHeight = GRID_SIZE / 6;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y + height + 2, healthBarWidth, healthBarHeight);
      
      ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
      ctx.fillRect(x, y + height + 2, healthBarWidth * healthPercent, healthBarHeight);
    };
    
    const drawResource = (ctx: CanvasRenderingContext2D, resource: Resource) => {
      const x = resource.position.x * GRID_SIZE;
      const y = resource.position.y * GRID_SIZE;
      
      ctx.fillStyle = COLORS.RESOURCE;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(x, y - GRID_SIZE/2);
      ctx.lineTo(x + GRID_SIZE/2, y);
      ctx.lineTo(x, y + GRID_SIZE/2);
      ctx.lineTo(x - GRID_SIZE/2, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      const amountPercent = resource.amount / 5000;
      const indicatorSize = GRID_SIZE / 3 * amountPercent;
      
      ctx.beginPath();
      ctx.arc(x, y, indicatorSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    
    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas border border-gray-400"
        onClick={handleCanvasClick}
      />
    );
  }
);

GameCanvas.displayName = 'GameCanvas';

export default GameCanvas;
