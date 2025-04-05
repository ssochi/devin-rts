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
      
      ctx.save();
      
      switch (unit.type) {
        case UnitType.HARVESTER:
          const bodyWidth = GRID_SIZE * 1.2;
          const bodyHeight = GRID_SIZE * 0.8;
          
          ctx.beginPath();
          ctx.roundRect(x - bodyWidth/2, y - bodyHeight/2, bodyWidth, bodyHeight, [5]);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(x - bodyWidth/4, y - bodyHeight/2, bodyWidth/5, Math.PI, 0, true);
          ctx.fill();
          ctx.stroke();
          
          const wheelRadius = GRID_SIZE/8;
          const wheelPositions = [
            { x: x - bodyWidth/3, y: y + bodyHeight/2 },
            { x: x, y: y + bodyHeight/2 },
            { x: x + bodyWidth/3, y: y + bodyHeight/2 }
          ];
          
          ctx.fillStyle = '#333';
          wheelPositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, wheelRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
          
          ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.beginPath();
          ctx.moveTo(x + bodyWidth/2, y);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/3, y - GRID_SIZE/4);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/3, y + GRID_SIZE/4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          if (unit.carryingResource && unit.carryingResource > 0) {
            ctx.fillStyle = COLORS.RESOURCE;
            ctx.beginPath();
            ctx.arc(x + bodyWidth/4, y - bodyHeight/4, GRID_SIZE/5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(x + bodyWidth/4, y - bodyHeight/4, GRID_SIZE/3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
          break;
          
        case UnitType.TANK:
          const tankWidth = GRID_SIZE * 1.2;
          const tankHeight = GRID_SIZE * 0.7;
          
          ctx.beginPath();
          ctx.roundRect(x - tankWidth/2, y - tankHeight/3, tankWidth, tankHeight, [3]);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#333';
          ctx.fillRect(x - tankWidth/2 - GRID_SIZE/10, y - tankHeight/3, tankWidth + GRID_SIZE/5, tankHeight/4);
          ctx.strokeRect(x - tankWidth/2 - GRID_SIZE/10, y - tankHeight/3, tankWidth + GRID_SIZE/5, tankHeight/4);
          
          ctx.fillRect(x - tankWidth/2 - GRID_SIZE/10, y + tankHeight/3 - tankHeight/4, tankWidth + GRID_SIZE/5, tankHeight/4);
          ctx.strokeRect(x - tankWidth/2 - GRID_SIZE/10, y + tankHeight/3 - tankHeight/4, tankWidth + GRID_SIZE/5, tankHeight/4);
          
          ctx.strokeStyle = '#555';
          for (let i = 0; i < 6; i++) {
            const tx = x - tankWidth/2 + i * tankWidth/5;
            ctx.beginPath();
            ctx.moveTo(tx, y - tankHeight/3);
            ctx.lineTo(tx, y - tankHeight/3 + tankHeight/4);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(tx, y + tankHeight/3 - tankHeight/4);
            ctx.lineTo(tx, y + tankHeight/3);
            ctx.stroke();
          }
          
          ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.beginPath();
          ctx.arc(x, y - tankHeight/3, tankHeight/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillRect(x, y - tankHeight/3 - tankHeight/8, tankWidth/2, tankHeight/4);
          ctx.strokeRect(x, y - tankHeight/3 - tankHeight/8, tankWidth/2, tankHeight/4);
          
          ctx.beginPath();
          ctx.arc(x + tankWidth/2, y - tankHeight/3, tankHeight/8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
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
          
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(x - GRID_SIZE/6, y - GRID_SIZE/8);
          ctx.lineTo(x - GRID_SIZE/2, y);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + GRID_SIZE/6, y - GRID_SIZE/8);
          ctx.lineTo(x + GRID_SIZE/2, y);
          ctx.stroke();
          
          ctx.fillStyle = '#333';
          ctx.fillRect(x + GRID_SIZE/3, y - GRID_SIZE/12, GRID_SIZE/3, GRID_SIZE/6);
          ctx.strokeRect(x + GRID_SIZE/3, y - GRID_SIZE/12, GRID_SIZE/3, GRID_SIZE/6);
          
          ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(x - GRID_SIZE/6, y + GRID_SIZE/4);
          ctx.lineTo(x - GRID_SIZE/4, y + GRID_SIZE/2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + GRID_SIZE/6, y + GRID_SIZE/4);
          ctx.lineTo(x + GRID_SIZE/4, y + GRID_SIZE/2);
          ctx.stroke();
          break;
      }
      
      ctx.restore();
      
      const healthPercent = unit.health / 100;
      const healthBarWidth = GRID_SIZE;
      const healthBarHeight = GRID_SIZE / 8;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x - healthBarWidth/2, y + GRID_SIZE/2, healthBarWidth, healthBarHeight);
      
      ctx.fillStyle = healthPercent > 0.6 ? '#2ecc71' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(x - healthBarWidth/2, y + GRID_SIZE/2, healthBarWidth * healthPercent, healthBarHeight);
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x - healthBarWidth/2, y + GRID_SIZE/2, healthBarWidth, healthBarHeight);
    };
    
    const drawBuilding = (ctx: CanvasRenderingContext2D, building: Building) => {
      const x = building.position.x * GRID_SIZE;
      const y = building.position.y * GRID_SIZE;
      const width = building.size.width * GRID_SIZE;
      const height = building.size.height * GRID_SIZE;
      
      ctx.fillStyle = building.selected ? COLORS.SELECTED : COLORS.PLAYER;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      
      ctx.save();
      
      switch (building.type) {
        case BuildingType.COMMAND_CENTER:
          ctx.beginPath();
          ctx.roundRect(x, y, width, height * 0.8, [5]);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width/2, y - height/4);
          ctx.lineTo(x + width, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#1a5276';
          const windowSize = width / 10;
          const windowRows = 3;
          const windowCols = 5;
          const windowMarginX = width / 15;
          const windowMarginY = height / 10;
          
          for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
              if (row === windowRows - 1 && col === Math.floor(windowCols / 2)) {
                ctx.fillStyle = '#212f3d';
                ctx.fillRect(
                  x + width/2 - windowSize * 1.5, 
                  y + height * 0.8 - windowSize * 2, 
                  windowSize * 3, 
                  windowSize * 2
                );
                ctx.strokeRect(
                  x + width/2 - windowSize * 1.5, 
                  y + height * 0.8 - windowSize * 2, 
                  windowSize * 3, 
                  windowSize * 2
                );
              } else {
                ctx.fillStyle = '#1a5276';
                ctx.fillRect(
                  x + windowMarginX + col * (windowSize + windowMarginX), 
                  y + windowMarginY + row * (windowSize + windowMarginY), 
                  windowSize, 
                  windowSize
                );
              }
            }
          }
          
          ctx.fillStyle = building.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.beginPath();
          ctx.moveTo(x + width/2, y - height/4);
          ctx.lineTo(x + width/2, y - height/2);
          ctx.lineTo(x + width/2 + width/20, y - height/2.5);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(x + width/2 + width/20, y - height/2.5, width/15, 0, Math.PI * 2);
          ctx.stroke();
          break;
          
        case BuildingType.BARRACKS:
          ctx.beginPath();
          ctx.roundRect(x, y, width, height * 0.9, [3]);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width/2, y - height/6);
          ctx.lineTo(x + width, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#1a5276';
          const barracksWindowSize = width / 8;
          const barracksWindowRows = 2;
          const barracksWindowCols = 3;
          
          for (let row = 0; row < barracksWindowRows; row++) {
            for (let col = 0; col < barracksWindowCols; col++) {
              if (row === barracksWindowRows - 1 && col === 1) {
                ctx.fillStyle = '#212f3d';
                ctx.fillRect(
                  x + width/3, 
                  y + height * 0.9 - barracksWindowSize * 2, 
                  barracksWindowSize * 1.5, 
                  barracksWindowSize * 2
                );
                ctx.strokeRect(
                  x + width/3, 
                  y + height * 0.9 - barracksWindowSize * 2, 
                  barracksWindowSize * 1.5, 
                  barracksWindowSize * 2
                );
              } else {
                ctx.fillStyle = '#1a5276';
                ctx.fillRect(
                  x + width/6 + col * width/3, 
                  y + height/6 + row * height/3, 
                  barracksWindowSize, 
                  barracksWindowSize
                );
              }
            }
          }
          
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(x + width/2, y - height/6);
          ctx.lineTo(x + width/2, y - height/2);
          ctx.lineTo(x + width/2 + width/6, y - height/3);
          ctx.lineTo(x + width/2, y - height/4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        case BuildingType.POWER_PLANT:
          ctx.beginPath();
          ctx.roundRect(x, y, width, height * 0.5, [3]);
          ctx.fill();
          ctx.stroke();
          
          const towerCount = 2;
          const towerWidth = width / 3;
          const towerSpacing = width / 10;
          
          for (let i = 0; i < towerCount; i++) {
            const tx = x + towerSpacing + i * (towerWidth + towerSpacing);
            const ty = y + height * 0.5;
            
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.bezierCurveTo(
              tx, ty - height * 0.1,
              tx + towerWidth, ty - height * 0.1,
              tx + towerWidth, ty
            );
            ctx.lineTo(tx + towerWidth, ty + height * 0.4);
            ctx.bezierCurveTo(
              tx + towerWidth * 0.9, ty + height * 0.5,
              tx + towerWidth * 0.1, ty + height * 0.5,
              tx, ty + height * 0.4
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.ellipse(tx + towerWidth/2, ty, towerWidth/2, towerWidth/6, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(tx + towerWidth/2, ty - height * 0.1, towerWidth/3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(tx + towerWidth/2, ty - height * 0.2, towerWidth/4, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + height * 0.25);
          ctx.lineTo(x - width * 0.2, y + height * 0.25);
          ctx.lineTo(x - width * 0.2, y - height * 0.1);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + width, y + height * 0.25);
          ctx.lineTo(x + width + width * 0.2, y + height * 0.25);
          ctx.lineTo(x + width + width * 0.2, y - height * 0.1);
          ctx.stroke();
          break;
          
        case BuildingType.WAR_FACTORY:
          ctx.fillStyle = building.selected ? COLORS.SELECTED : '#3a6351';
          ctx.beginPath();
          ctx.roundRect(x, y + height * 0.2, width, height * 0.8, [3]);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y + height * 0.2);
          ctx.lineTo(x + width * 0.1, y);
          ctx.lineTo(x + width * 0.9, y);
          ctx.lineTo(x + width, y + height * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#212f3d';
          ctx.beginPath();
          ctx.roundRect(x + width * 0.3, y + height * 0.6, width * 0.4, height * 0.4, [5, 5, 0, 0]);
          ctx.fill();
          ctx.stroke();
          
          const stackCount = 2;
          const stackWidth = width * 0.1;
          const stackHeight = height * 0.3;
          
          for (let i = 0; i < stackCount; i++) {
            const sx = x + width * 0.25 + i * width * 0.5;
            const sy = y;
            
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.roundRect(sx - stackWidth/2, sy - stackHeight, stackWidth, stackHeight, [3]);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.beginPath();
            ctx.arc(sx, sy - stackHeight - height * 0.05, stackWidth * 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(sx + stackWidth/2, sy - stackHeight - height * 0.15, stackWidth * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.fillStyle = '#1a5276';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(
              x + width * 0.15 + i * width * 0.3, 
              y + height * 0.3, 
              width * 0.1, 
              height * 0.1
            );
            ctx.strokeRect(
              x + width * 0.15 + i * width * 0.3, 
              y + height * 0.3, 
              width * 0.1, 
              height * 0.1
            );
          }
          break;
          
        case BuildingType.REFINERY:
          ctx.beginPath();
          ctx.roundRect(x, y, width, height * 0.5, [3]);
          ctx.fill();
          ctx.stroke();
          
          const siloCount = 2;
          const siloWidth = width / 3;
          const siloSpacing = width / 6;
          
          for (let i = 0; i < siloCount; i++) {
            const sx = x + siloSpacing + i * (siloWidth + siloSpacing);
            const sy = y + height * 0.5;
            
            ctx.beginPath();
            ctx.roundRect(sx, sy, siloWidth, height * 0.5, [0, 0, 3, 3]);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(sx + siloWidth/2, sy, siloWidth/2, Math.PI, 0, true);
            ctx.fill();
            ctx.stroke();
            
            ctx.strokeStyle = '#555';
            for (let j = 1; j < 4; j++) {
              ctx.beginPath();
              ctx.moveTo(sx, sy + j * height * 0.1);
              ctx.lineTo(sx + siloWidth, sy + j * height * 0.1);
              ctx.stroke();
            }
          }
          
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + width * 0.8, y + height * 0.25);
          ctx.lineTo(x + width * 1.2, y + height * 0.25);
          ctx.stroke();
          
          ctx.fillStyle = COLORS.RESOURCE;
          ctx.beginPath();
          ctx.arc(x + width * 0.5, y + height * 0.25, width * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#555';
          ctx.fillRect(x - width * 0.2, y + height * 0.4, width * 0.2, height * 0.1);
          ctx.strokeRect(x - width * 0.2, y + height * 0.4, width * 0.2, height * 0.1);
          
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - width * 0.2 + i * width * 0.05, y + height * 0.4);
            ctx.lineTo(x - width * 0.2 + i * width * 0.05, y + height * 0.5);
            ctx.stroke();
          }
          break;
      }
      
      ctx.restore();
      
      if (building.constructionProgress !== undefined && building.constructionProgress < 100) {
        const progressPercent = building.constructionProgress / 100;
        const progressBarWidth = width;
        const progressBarHeight = GRID_SIZE / 6;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y - progressBarHeight - 2, progressBarWidth, progressBarHeight);
        
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x, y - progressBarHeight - 2, progressBarWidth * progressPercent, progressBarHeight);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y - progressBarHeight - 2, progressBarWidth, progressBarHeight);
      }
      
      const healthPercent = building.health / BUILDING_PROPERTIES[building.type].health;
      const healthBarWidth = width;
      const healthBarHeight = GRID_SIZE / 6;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x, y + height + 2, healthBarWidth, healthBarHeight);
      
      ctx.fillStyle = healthPercent > 0.6 ? '#2ecc71' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(x, y + height + 2, healthBarWidth * healthPercent, healthBarHeight);
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y + height + 2, healthBarWidth, healthBarHeight);
    };
    
    const drawResource = (ctx: CanvasRenderingContext2D, resource: Resource) => {
      const x = resource.position.x * GRID_SIZE;
      const y = resource.position.y * GRID_SIZE;
      
      ctx.save();
      
      const resourceSize = GRID_SIZE * 0.8;
      const positions = [
        { x: x, y: y },
        { x: x + resourceSize/3, y: y - resourceSize/3 },
        { x: x - resourceSize/3, y: y - resourceSize/3 },
        { x: x + resourceSize/3, y: y + resourceSize/3 },
        { x: x - resourceSize/3, y: y + resourceSize/3 }
      ];
      
      positions.forEach((pos, index) => {
        const hue = 45 + index * 3; // Gold/yellow hue with slight variation
        ctx.fillStyle = `hsl(${hue}, 90%, ${60 + index * 5}%)`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - resourceSize/4);
        ctx.lineTo(pos.x + resourceSize/4, pos.y);
        ctx.lineTo(pos.x, pos.y + resourceSize/4);
        ctx.lineTo(pos.x - resourceSize/4, pos.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(pos.x - resourceSize/8, pos.y - resourceSize/8);
        ctx.lineTo(pos.x, pos.y - resourceSize/6);
        ctx.lineTo(pos.x + resourceSize/8, pos.y - resourceSize/8);
        ctx.closePath();
        ctx.fill();
      });
      
      const amountPercent = resource.amount / 5000;
      
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = `rgba(255, 215, 0, ${amountPercent})`;
      ctx.beginPath();
      ctx.arc(x, y, resourceSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;
      ctx.font = `${Math.floor(GRID_SIZE/3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(Math.floor(resource.amount).toString(), x, y + resourceSize * 0.6);
      ctx.fillText(Math.floor(resource.amount).toString(), x, y + resourceSize * 0.6);
      
      ctx.restore();
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
