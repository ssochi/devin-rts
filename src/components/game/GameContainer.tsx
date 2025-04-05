import { useRef } from 'react';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';
import { useGameState } from '../../hooks/game/useGameState';
import '../../lib/game/constants';

const GameContainer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    gameState, 
    selectUnit, 
    selectBuilding, 
    buildStructure, 
    createUnit,
    harvestResource,
    moveUnit,
    attackTarget
  } = useGameState();

  return (
    <div className="game-container w-full h-screen flex flex-col">
      <div className="game-header bg-gray-800 text-white p-2 flex justify-between items-center">
        <h1 className="text-xl font-bold">几何红警 (Geometric Red Alert)</h1>
        <div className="resource-display flex gap-4">
          <div className="resource">
            <span className="font-bold">金钱:</span> {gameState.resources.money}
          </div>
          <div className="resource">
            <span className="font-bold">电力:</span> {gameState.resources.power}
          </div>
        </div>
      </div>
      <div className="game-content flex flex-1 overflow-hidden">
        <GameCanvas 
          ref={canvasRef} 
          gameState={gameState}
          onUnitSelect={selectUnit}
          onBuildingSelect={selectBuilding}
          onUnitMove={moveUnit}
          onAttack={attackTarget}
          onHarvest={harvestResource}
        />
        <GameUI 
          gameState={gameState}
          onBuildStructure={buildStructure}
          onCreateUnit={createUnit}
        />
      </div>
    </div>
  );
};

export default GameContainer;
