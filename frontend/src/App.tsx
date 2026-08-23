import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import GridVisualizer from './components/GridVisualizer';
import { useAnimationEngine } from './hooks/useAnimationEngine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type Maze = {
  grid: number[][];
  start: [number, number];
  goal: [number, number];
};

type AlgoResult = {
  success: boolean;
  path: [number, number][];
  trace: any[];
  nodes_expanded: number;
  execution_time_ms: number;
  path_cost: number;
};

type SolveResults = Record<string, AlgoResult>;

const Legend = () => (
  <div className="legend-container glass-panel">
    <div className="legend-item"><div className="legend-box cell-start"></div> Start Node</div>
    <div className="legend-item"><div className="legend-box cell-goal"></div> Goal Node</div>
    <div className="legend-item"><div className="legend-box cell-wall"></div> Wall / Obstacle</div>
    <div className="legend-item"><div className="legend-box cell-empty"></div> Unvisited</div>
    <div className="legend-item"><div className="legend-box cell-frontier"></div> Frontier (Discovered)</div>
    <div className="legend-item"><div className="legend-box cell-current"></div> Current Evaluated</div>
    <div className="legend-item"><div className="legend-box cell-visited"></div> Visited (Closed)</div>
    <div className="legend-item"><div className="legend-box cell-path"></div> Final Path</div>
  </div>
);

function App() {
  const [health, setHealth] = useState<string>('Offline');
  const [maze, setMaze] = useState<Maze | null>(null);
  const [results, setResults] = useState<SolveResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Configuration States
  const [gridSize, setGridSize] = useState<number>(20);
  const [density, setDensity] = useState<number>(0.25);
  const [seed, setSeed] = useState<string>('');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);

  // Base speed is 25ms (1x). 
  const engine = useAnimationEngine(25 / speedMultiplier);

  useEffect(() => {
    engine.setSpeedMs(25 / speedMultiplier);
  }, [speedMultiplier, engine]);

  useEffect(() => {
    const checkHealth = () => {
      axios.get(`${API_URL}/health`, { timeout: 5000 })
        .then(() => setHealth('Online'))
        .catch(() => setHealth('Offline'));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateAndSolve = async () => {
    setLoading(true);
    setResults(null);
    engine.reset();
    engine.setMaxSteps(0);
    
    try {
      // 1. Generate Maze
      const genRes = await axios.post(`${API_URL}/generate`, {
        rows: gridSize,
        cols: gridSize,
        density: density,
        seed: seed ? parseInt(seed, 10) : undefined
      });
      const newMaze = genRes.data;
      setMaze(newMaze);

      // 2. Auto-Solve immediately
      const solveRes = await axios.post(`${API_URL}/solve`, {
        grid: newMaze.grid,
        start: newMaze.start,
        goal: newMaze.goal
      });
      setResults(solveRes.data);
      
      const maxSteps = Math.max(...Object.values(solveRes.data as SolveResults).map((r: any) => r.trace.length));
      engine.setMaxSteps(maxSteps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">
          <h1>A* Comparative Visualizer</h1>
        </div>
        <div className={`status ${health.toLowerCase()}`}>
          <span className="status-dot"></span>
          Backend: {health}
        </div>
      </header>

      {/* Unified Top Control Panel */}
      <div className="top-control-panel glass-panel">
        <div className="control-row">
          <div className="control-item">
            <label>Grid Size: {gridSize}x{gridSize}</label>
            <input 
              type="range" min="10" max="40" step="1" 
              value={gridSize} 
              onChange={(e) => setGridSize(parseInt(e.target.value))} 
              disabled={loading}
            />
          </div>
          <div className="control-item">
            <label>Obstacle Density: {Math.round(density * 100)}%</label>
            <input 
              type="range" min="0" max="0.5" step="0.01" 
              value={density} 
              onChange={(e) => setDensity(parseFloat(e.target.value))} 
              disabled={loading}
            />
          </div>
          <div className="control-item">
            <label>Random Seed</label>
            <input 
              type="number" 
              placeholder="Random" 
              value={seed} 
              onChange={(e) => setSeed(e.target.value)} 
              disabled={loading}
            />
          </div>
          <button className="btn-primary" onClick={handleGenerateAndSolve} disabled={loading}>
            {loading ? 'Generating...' : 'Generate & Solve'}
          </button>
        </div>

        <div className="control-row playback-row">
          <div className="playback-buttons">
            {engine.isPlaying ? (
              <button className="icon-btn play-btn" onClick={engine.pause} disabled={!results}><Pause size={18} /> Pause</button>
            ) : (
              <button className="icon-btn play-btn" onClick={engine.play} disabled={!results}><Play size={18} /> Play</button>
            )}
            <button className="icon-btn" onClick={engine.reset} disabled={!results}><RotateCcw size={18} /> Reset</button>
            <div className="divider"></div>
            <button className="icon-btn" onClick={engine.stepBackward} disabled={!results || engine.currentStep === 0}><SkipBack size={18} /> Step Back</button>
            <button className="icon-btn" onClick={engine.stepForward} disabled={!results || engine.currentStep >= engine.maxSteps - 1}><SkipForward size={18} /> Step Fwd</button>
          </div>
          
          <div className="control-item speed-control">
            <label>Speed: {speedMultiplier.toFixed(2)}×</label>
            <input 
              type="range" min="0.25" max="5" step="0.25" 
              value={speedMultiplier} 
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            />
          </div>

          {results && (
            <div className="playback-progress">
              Step: {engine.currentStep} / {Math.max(0, engine.maxSteps - 1)}
            </div>
          )}
        </div>
      </div>

      {maze && <Legend />}
      
      <div className="visualizer-container">
        {!maze ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <p>Adjust parameters and click Generate & Solve to begin visualization.</p>
          </div>
        ) : (
          <div className="grids-wrapper">
            {['manhattan', 'euclidean', 'chebyshev', 'zero'].map((algo) => {
              const res = results?.[algo];
              const titleMap: Record<string, string> = {
                manhattan: 'A* (Manhattan)',
                euclidean: 'A* (Euclidean)',
                chebyshev: 'A* (Chebyshev)',
                zero: 'Dijkstra (No Heuristic)'
              };
              
              const traceLen = res?.trace?.length || 0;
              const stepIndex = Math.min(engine.currentStep, Math.max(0, traceLen - 1));
              const isFinished = res !== undefined && (stepIndex === traceLen - 1) && !engine.isPlaying;
              
              return (
                <div key={algo} className="glass-panel" style={{ borderRadius: '16px' }}>
                  <GridVisualizer
                    title={titleMap[algo]}
                    grid={maze.grid}
                    start={maze.start}
                    goal={maze.goal}
                    path={isFinished ? res?.path : undefined}
                    trace={res?.trace}
                    stepIndex={stepIndex}
                    isFinished={isFinished}
                    finalStats={res ? {
                      nodesExpanded: res.nodes_expanded,
                      executionTimeMs: res.execution_time_ms,
                      pathCost: res.path_cost
                    } : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
