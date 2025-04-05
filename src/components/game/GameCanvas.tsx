import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
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
    const [animationTime, setAnimationTime] = useState(0);
    
    useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);
    
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      
      let lastTimestamp = 0;
      let animationFrameId: number;
      
      const renderLoop = (timestamp: number) => {
        const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016;
        lastTimestamp = timestamp;
        
        setAnimationTime(prevTime => prevTime + deltaTime);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawGrid(ctx);
        
        const resourcePulse = Math.sin(animationTime * 2) * 0.2 + 0.8;
        
        gameState.resourceNodes.forEach(resource => {
          drawResource(ctx, resource, resourcePulse);
        });
        
        gameState.buildings.forEach(building => {
          drawBuilding(ctx, building);
        });
        
        gameState.units.forEach(unit => {
          const unitBobOffset = Math.sin(animationTime * 3 + unit.id.charCodeAt(0)) * 2;
          drawUnit(ctx, unit, unitBobOffset);
        });
        
        animationFrameId = requestAnimationFrame(renderLoop);
      };
      
      animationFrameId = requestAnimationFrame(renderLoop);
      
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }, [gameState, animationTime]);
    
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
      const terrainPattern = createTerrainPattern(ctx);
      ctx.fillStyle = terrainPattern || '#e5e7eb';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.strokeStyle = 'rgba(236, 240, 241, 0.3)';
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
      
      addTerrainDetails(ctx);
    };
    
    const createTerrainPattern = (ctx: CanvasRenderingContext2D) => {
      const patternCanvas = document.createElement('canvas');
      const patternCtx = patternCanvas.getContext('2d');
      
      if (!patternCtx) return null;
      
      const size = GRID_SIZE * 4;
      patternCanvas.width = size;
      patternCanvas.height = size;
      
      patternCtx.fillStyle = '#d2d6bc';
      patternCtx.fillRect(0, 0, size, size);
      
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * GRID_SIZE / 4 + GRID_SIZE / 8;
        
        patternCtx.fillStyle = Math.random() > 0.5 ? '#c4c8b0' : '#dfe3c8';
        patternCtx.beginPath();
        patternCtx.arc(x, y, radius, 0, Math.PI * 2);
        patternCtx.fill();
      }
      
      return ctx.createPattern(patternCanvas, 'repeat');
    };
    
    const addTerrainDetails = (ctx: CanvasRenderingContext2D) => {
      const detailsCount = 15;
      
      for (let i = 0; i < detailsCount; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const y = Math.random() * CANVAS_HEIGHT;
        const size = Math.random() * GRID_SIZE / 2 + GRID_SIZE / 4;
        
        if (x > CANVAS_WIDTH / 2 - GRID_SIZE * 5 && 
            x < CANVAS_WIDTH / 2 + GRID_SIZE * 5 && 
            y > CANVAS_HEIGHT / 2 - GRID_SIZE * 5 && 
            y < CANVAS_HEIGHT / 2 + GRID_SIZE * 5) {
          continue;
        }
        
        ctx.fillStyle = Math.random() > 0.7 ? '#a3a697' : '#b8bba9';
        
        if (Math.random() > 0.7) {
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, y, size, size / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    
    const drawUnit = (ctx: CanvasRenderingContext2D, unit: Unit, bobOffset: number = 0) => {
      const x = unit.position.x * GRID_SIZE;
      const y = unit.position.y * GRID_SIZE - bobOffset; // Apply vertical bobbing animation
      
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
          
          ctx.fillStyle = '#87CEEB';
          ctx.beginPath();
          ctx.arc(x - bodyWidth/4, y - bodyHeight/2, bodyWidth/8, Math.PI, 0, true);
          ctx.fill();
          ctx.stroke();
          
          const wheelRadius = GRID_SIZE/8;
          const wheelRotation = unit.moving ? Date.now() / 100 : 0;
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
            
            if (unit.moving) {
              ctx.save();
              ctx.translate(pos.x, pos.y);
              ctx.rotate(wheelRotation);
              
              for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, wheelRadius);
                ctx.stroke();
              }
              
              ctx.restore();
            }
          });
          
          ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.beginPath();
          ctx.moveTo(x + bodyWidth/2, y);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/3, y - GRID_SIZE/4);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/3, y + GRID_SIZE/4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          const clawOpen = unit.isHarvesting ? Math.sin(Date.now() / 200) * 0.5 + 0.5 : 0;
          ctx.beginPath();
          ctx.moveTo(x + bodyWidth/2 + GRID_SIZE/3, y - GRID_SIZE/4);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/2, y - GRID_SIZE/4 - clawOpen * GRID_SIZE/4);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + bodyWidth/2 + GRID_SIZE/3, y + GRID_SIZE/4);
          ctx.lineTo(x + bodyWidth/2 + GRID_SIZE/2, y + GRID_SIZE/4 + clawOpen * GRID_SIZE/4);
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
          
          const treadOffset = unit.moving ? Math.sin(Date.now() / 100) * (GRID_SIZE/15) : 0;
          const treadWidth = tankWidth + GRID_SIZE/5;
          const treadHeight = tankHeight/4;
          
          ctx.fillRect(x - tankWidth/2 - GRID_SIZE/10 + treadOffset, y - tankHeight/3, treadWidth, treadHeight);
          ctx.strokeRect(x - tankWidth/2 - GRID_SIZE/10 + treadOffset, y - tankHeight/3, treadWidth, treadHeight);
          
          ctx.fillRect(x - tankWidth/2 - GRID_SIZE/10 - treadOffset, y + tankHeight/3 - treadHeight, treadWidth, treadHeight);
          ctx.strokeRect(x - tankWidth/2 - GRID_SIZE/10 - treadOffset, y + tankHeight/3 - treadHeight, treadWidth, treadHeight);
          
          ctx.strokeStyle = '#555';
          const treadSegments = 8;
          const segmentWidth = treadWidth / treadSegments;
          
          for (let i = 0; i <= treadSegments; i++) {
            const topTx = x - tankWidth/2 - GRID_SIZE/10 + treadOffset + i * segmentWidth;
            const bottomTx = x - tankWidth/2 - GRID_SIZE/10 - treadOffset + i * segmentWidth;
            
            ctx.beginPath();
            ctx.moveTo(topTx, y - tankHeight/3);
            ctx.lineTo(topTx, y - tankHeight/3 + treadHeight);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(bottomTx, y + tankHeight/3 - treadHeight);
            ctx.lineTo(bottomTx, y + tankHeight/3);
            ctx.stroke();
          }
          
          ctx.fillStyle = unit.selected ? COLORS.SELECTED : COLORS.PLAYER;
          ctx.beginPath();
          ctx.arc(x, y - tankHeight/3, tankHeight/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          const cannonAngle = unit.targetPosition 
            ? Math.atan2(unit.targetPosition.y - unit.position.y, unit.targetPosition.x - unit.position.x) 
            : 0;
          
          ctx.save();
          ctx.translate(x, y - tankHeight/3);
          ctx.rotate(cannonAngle);
          
          ctx.fillRect(0, -tankHeight/8, tankWidth/1.5, tankHeight/4);
          ctx.strokeRect(0, -tankHeight/8, tankWidth/1.5, tankHeight/4);
          
          ctx.beginPath();
          ctx.arc(tankWidth/1.5, 0, tankHeight/6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.restore();
          
          ctx.fillStyle = '#555';
          ctx.beginPath();
          ctx.arc(x, y - tankHeight/3, tankHeight/6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - tankWidth/4, y - tankHeight/3);
          ctx.lineTo(x - tankWidth/4, y - tankHeight/3 - tankHeight);
          ctx.stroke();
          
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(x - tankWidth/4, y - tankHeight/3 - tankHeight);
          ctx.lineTo(x - tankWidth/4, y - tankHeight/3 - tankHeight + tankHeight/3);
          ctx.lineTo(x - tankWidth/4 + tankWidth/6, y - tankHeight/3 - tankHeight + tankHeight/6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.stroke();
          break;
          
        case UnitType.INFANTRY:
          const legOffset = unit.moving ? Math.sin(Date.now() / 150) * (GRID_SIZE/10) : 0;
          const armOffset = unit.moving ? Math.cos(Date.now() / 200) * (GRID_SIZE/15) : 0;
          
          ctx.beginPath();
          ctx.arc(x, y - GRID_SIZE/3, GRID_SIZE/4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y - GRID_SIZE/6);
          ctx.lineTo(x - GRID_SIZE/3 + legOffset, y + GRID_SIZE/3);
          ctx.lineTo(x + GRID_SIZE/3 - legOffset, y + GRID_SIZE/3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(x - GRID_SIZE/6, y - GRID_SIZE/8);
          ctx.lineTo(x - GRID_SIZE/2 - armOffset, y);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + GRID_SIZE/6, y - GRID_SIZE/8);
          ctx.lineTo(x + GRID_SIZE/2 + armOffset, y);
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
      
      const isConstructing = building.constructionProgress !== undefined && building.constructionProgress < 100;
      
      ctx.fillStyle = building.selected ? COLORS.SELECTED : COLORS.PLAYER;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      
      ctx.save();
      
      if (isConstructing && building.constructionProgress !== undefined) {
        ctx.strokeStyle = '#555';
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        const progressHeight = height * (building.constructionProgress / 100);
        ctx.beginPath();
        ctx.rect(x, y + height - progressHeight, width, progressHeight);
        ctx.clip();
      }
      
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
    
    const drawResource = (ctx: CanvasRenderingContext2D, resource: Resource, pulseScale: number = 1) => {
      const x = resource.position.x * GRID_SIZE;
      const y = resource.position.y * GRID_SIZE;
      
      ctx.save();
      
      const resourceSize = GRID_SIZE * 0.8 * pulseScale;
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
