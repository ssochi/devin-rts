import { Position, Building, Unit } from '../../hooks/game/useGameState';
import { GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

interface GridNode {
  x: number;
  y: number;
  f: number; // Total cost (g + h)
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to goal)
  walkable: boolean;
  parent: GridNode | null;
}

export const createGrid = (
  buildings: Building[],
  units: Unit[],
  ignoreUnitId?: string
): GridNode[][] => {
  const gridWidth = Math.ceil(CANVAS_WIDTH / GRID_SIZE);
  const gridHeight = Math.ceil(CANVAS_HEIGHT / GRID_SIZE);
  
  const grid: GridNode[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    grid[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      grid[y][x] = {
        x,
        y,
        f: 0,
        g: 0,
        h: 0,
        walkable: true,
        parent: null
      };
    }
  }
  
  buildings.forEach(building => {
    const startX = Math.floor(building.position.x / GRID_SIZE);
    const startY = Math.floor(building.position.y / GRID_SIZE);
    const endX = Math.ceil((building.position.x + building.size.width) / GRID_SIZE);
    const endY = Math.ceil((building.position.y + building.size.height) / GRID_SIZE);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
          grid[y][x].walkable = false;
        }
      }
    }
  });
  
  units.forEach(unit => {
    if (unit.id !== ignoreUnitId) {
      const gridX = Math.floor(unit.position.x / GRID_SIZE);
      const gridY = Math.floor(unit.position.y / GRID_SIZE);
      
      if (gridY >= 0 && gridY < gridHeight && gridX >= 0 && gridX < gridWidth) {
        grid[gridY][gridX].walkable = false;
      }
    }
  });
  
  return grid;
};

export const worldToGrid = (position: Position): { x: number, y: number } => {
  return {
    x: Math.floor(position.x / GRID_SIZE),
    y: Math.floor(position.y / GRID_SIZE)
  };
};

export const gridToWorld = (gridX: number, gridY: number): Position => {
  return {
    x: gridX * GRID_SIZE + GRID_SIZE / 2,
    y: gridY * GRID_SIZE + GRID_SIZE / 2
  };
};

const heuristic = (a: { x: number, y: number }, b: { x: number, y: number }): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const getNeighbors = (grid: GridNode[][], node: GridNode): GridNode[] => {
  const neighbors: GridNode[] = [];
  const { x, y } = node;
  const directions = [
    { x: 0, y: -1 }, // North
    { x: 1, y: 0 },  // East
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }, // West
    { x: 1, y: -1 }, // Northeast
    { x: 1, y: 1 },  // Southeast
    { x: -1, y: 1 }, // Southwest
    { x: -1, y: -1 } // Northwest
  ];
  
  for (const dir of directions) {
    const newX = x + dir.x;
    const newY = y + dir.y;
    
    if (newY >= 0 && newY < grid.length && newX >= 0 && newX < grid[0].length) {
      if (dir.x !== 0 && dir.y !== 0) {
        if (!grid[y][newX].walkable || !grid[newY][x].walkable) {
          continue; // Skip this diagonal if adjacent cells are blocked
        }
      }
      
      neighbors.push(grid[newY][newX]);
    }
  }
  
  return neighbors;
};

export const findPath = (
  startPos: Position,
  endPos: Position,
  buildings: Building[],
  units: Unit[],
  unitId: string
): Position[] => {
  const grid = createGrid(buildings, units, unitId);
  const gridStart = worldToGrid(startPos);
  const gridEnd = worldToGrid(endPos);
  
  if (
    gridStart.y < 0 || gridStart.y >= grid.length || 
    gridStart.x < 0 || gridStart.x >= grid[0].length ||
    gridEnd.y < 0 || gridEnd.y >= grid.length || 
    gridEnd.x < 0 || gridEnd.x >= grid[0].length
  ) {
    return []; // Invalid path
  }
  
  if (!grid[gridEnd.y][gridEnd.x].walkable) {
    let nearestEnd: { x: number, y: number } | null = null;
    let minDistance = Infinity;
    
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x].walkable) {
          const distance = heuristic({ x, y }, gridEnd);
          if (distance < minDistance) {
            minDistance = distance;
            nearestEnd = { x, y };
          }
        }
      }
    }
    
    if (nearestEnd) {
      gridEnd.x = nearestEnd.x;
      gridEnd.y = nearestEnd.y;
    } else {
      return []; // No walkable cells found
    }
  }
  
  const startNode = grid[gridStart.y][gridStart.x];
  const endNode = grid[gridEnd.y][gridEnd.x];
  
  const openSet: GridNode[] = [startNode];
  const closedSet: Set<string> = new Set();
  
  startNode.g = 0;
  startNode.h = heuristic(gridStart, gridEnd);
  startNode.f = startNode.g + startNode.h;
  
  while (openSet.length > 0) {
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIndex].f) {
        currentIndex = i;
      }
    }
    
    const currentNode = openSet[currentIndex];
    
    if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
      const path: Position[] = [];
      let current: GridNode | null = currentNode;
      
      while (current) {
        path.unshift(gridToWorld(current.x, current.y));
        current = current.parent;
      }
      
      return path;
    }
    
    openSet.splice(currentIndex, 1);
    closedSet.add(`${currentNode.x},${currentNode.y}`);
    
    const neighbors = getNeighbors(grid, currentNode);
    for (const neighbor of neighbors) {
      if (closedSet.has(`${neighbor.x},${neighbor.y}`) || !neighbor.walkable) {
        continue;
      }
      
      const tentativeG = currentNode.g + (
        neighbor.x !== currentNode.x && neighbor.y !== currentNode.y ? 1.4 : 1
      ); // 1.4 for diagonal movement (√2)
      
      const inOpenSet = openSet.some(node => node.x === neighbor.x && node.y === neighbor.y);
      if (!inOpenSet || tentativeG < neighbor.g) {
        neighbor.parent = currentNode;
        neighbor.g = tentativeG;
        neighbor.h = heuristic({ x: neighbor.x, y: neighbor.y }, gridEnd);
        neighbor.f = neighbor.g + neighbor.h;
        
        if (!inOpenSet) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  return [];
};

export const checkCollision = (
  unit: Unit,
  buildings: Building[],
  units: Unit[]
): boolean => {
  for (const building of buildings) {
    const unitRadius = GRID_SIZE / 2;
    const buildingLeft = building.position.x;
    const buildingRight = building.position.x + building.size.width * GRID_SIZE;
    const buildingTop = building.position.y;
    const buildingBottom = building.position.y + building.size.height * GRID_SIZE;
    
    const closestX = Math.max(buildingLeft, Math.min(unit.position.x, buildingRight));
    const closestY = Math.max(buildingTop, Math.min(unit.position.y, buildingBottom));
    
    const distanceX = unit.position.x - closestX;
    const distanceY = unit.position.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    
    if (distanceSquared < unitRadius * unitRadius) {
      return true; // Collision detected
    }
  }
  
  for (const otherUnit of units) {
    if (unit.id === otherUnit.id) continue;
    
    const dx = unit.position.x - otherUnit.position.x;
    const dy = unit.position.y - otherUnit.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < GRID_SIZE) {
      return true; // Collision detected
    }
  }
  
  return false;
};

export const smoothPath = (path: Position[]): Position[] => {
  if (path.length <= 2) return path;
  
  const result: Position[] = [path[0]];
  let i = 0;
  
  while (i < path.length - 2) {
    let j = i + 2;
    while (j < path.length) {
      const dx = path[j].x - path[i].x;
      const dy = path[j].y - path[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > GRID_SIZE * 5) {
        j--;
        break;
      }
      
      j++;
    }
    
    result.push(path[j - 1]);
    i = j - 1;
  }
  
  if (result[result.length - 1] !== path[path.length - 1]) {
    result.push(path[path.length - 1]);
  }
  
  return result;
};
