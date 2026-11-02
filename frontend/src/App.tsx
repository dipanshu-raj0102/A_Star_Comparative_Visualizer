import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eraser,
  Flag,
  Keyboard,
  Moon,
  MousePointer2,
  Pencil,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Sun,
  Target,
  Wand2,
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import GridVisualizer from './components/GridVisualizer';
import { useAnimationEngine } from './hooks/useAnimationEngine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type Point = [number, number];
type Theme = 'dark' | 'light';
type Pattern = 'random' | 'rooms' | 'spiral' | 'stripes' | 'checkerboard' | 'clear';
type EditMode = 'wall' | 'erase' | 'start' | 'goal';

type Maze = {
  grid: number[][];
  start: Point;
  goal: Point;
  pattern?: Pattern;
  density?: number;
  seed?: number | string | null;
};

type TracePoint = {
  current?: Point;
  frontier?: Point[];
  visited?: Point[];
  g?: number;
  h?: number;
  f?: number;
};

type AlgoResult = {
  success: boolean;
  path: Point[];
  trace: TracePoint[];
  nodes_expanded: number;
  execution_time_ms: number;
  path_cost: number;
};

type AlgorithmKey = 'manhattan' | 'euclidean' | 'chebyshev' | 'zero';
type SolveResults = Record<AlgorithmKey, AlgoResult>;

const ALGORITHMS: Array<{ key: AlgorithmKey; title: string; short: string; color: string }> = [
  { key: 'manhattan', title: 'A* · Manhattan', short: 'Manhattan', color: '#4f8cff' },
  { key: 'euclidean', title: 'A* · Euclidean', short: 'Euclidean', color: '#b276ff' },
  { key: 'chebyshev', title: 'A* · Chebyshev', short: 'Chebyshev', color: '#14b8a6' },
  { key: 'zero', title: 'Dijkstra · No heuristic', short: 'Dijkstra', color: '#f59e0b' },
];

const PATTERN_OPTIONS: Array<{ value: Pattern; label: string; description: string }> = [
  { value: 'random', label: 'Seeded noise', description: 'Organic obstacles with a guaranteed route' },
  { value: 'rooms', label: 'Rooms & corridors', description: 'Chunky chambers connected by narrow doors' },
  { value: 'spiral', label: 'Spiral field', description: 'Concentric walls that reward good guidance' },
  { value: 'stripes', label: 'Signal stripes', description: 'Long barriers with staggered openings' },
  { value: 'checkerboard', label: 'Checkerboard', description: 'High-frequency alternating obstacles' },
  { value: 'clear', label: 'Open field', description: 'A clean baseline for comparing heuristics' },
];

const INITIAL_THEME = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem('astar-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const Legend = () => (
  <div className="legend-container glass-panel" aria-label="Grid legend">
    <div className="legend-heading"><Sparkles size={14} /> VISUAL KEY</div>
    <div className="legend-item"><div className="legend-box cell-start" /> Start</div>
    <div className="legend-item"><div className="legend-box cell-goal" /> Goal</div>
    <div className="legend-item"><div className="legend-box cell-wall" /> Wall</div>
    <div className="legend-item"><div className="legend-box cell-empty" /> Unvisited</div>
    <div className="legend-item"><div className="legend-box cell-frontier" /> Frontier</div>
    <div className="legend-item"><div className="legend-box cell-current" /> Evaluating</div>
    <div className="legend-item"><div className="legend-box cell-visited" /> Visited</div>
    <div className="legend-item"><div className="legend-box cell-path" /> Final path</div>
  </div>
);

function App() {
  const [health, setHealth] = useState<string>('Checking...');
  const [maze, setMaze] = useState<Maze | null>(null);
  const [results, setResults] = useState<SolveResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<Theme>(INITIAL_THEME);

  const [gridSize, setGridSize] = useState(20);
  const [density, setDensity] = useState(0.24);
  const [seed, setSeed] = useState('');
  const [pattern, setPattern] = useState<Pattern>('random');
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('wall');

  const engine = useAnimationEngine(25 / speedMultiplier);
  const { setSpeedMs } = engine;

  const selectedPattern = useMemo(
    () => PATTERN_OPTIONS.find((option) => option.value === pattern) || PATTERN_OPTIONS[0],
    [pattern],
  );
  const activePattern = useMemo(
    () => PATTERN_OPTIONS.find((option) => option.value === (maze?.pattern || pattern)) || selectedPattern,
    [maze?.pattern, pattern, selectedPattern],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('astar-theme', theme);
  }, [theme]);

  useEffect(() => {
    setSpeedMs(25 / speedMultiplier);
  }, [setSpeedMs, speedMultiplier]);

  useEffect(() => {
    const checkHealth = () => {
      axios.get(`${API_URL}/health`, { timeout: 5000 })
        .then(() => setHealth('Online'))
        .catch(() => setHealth('Offline'));
    };
    checkHealth();
    const interval = window.setInterval(checkHealth, 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.code === 'Space' && results) {
        event.preventDefault();
        engine.togglePlay();
      } else if (event.key === 'ArrowRight' && results) {
        event.preventDefault();
        engine.stepForward();
      } else if (event.key === 'ArrowLeft' && results) {
        event.preventDefault();
        engine.stepBackward();
      } else if (event.key.toLowerCase() === 'r' && results) {
        engine.reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [engine, results]);

  const solveBoard = async (board: Maze, showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    engine.pause();
    engine.reset();
    engine.setMaxSteps(0);
    setResults(null);

    try {
      const solveRes = await axios.post(`${API_URL}/solve`, {
        grid: board.grid,
        start: board.start,
        goal: board.goal,
      });
      const solveResults = solveRes.data as SolveResults;
      setResults(solveResults);
      const maxSteps = Math.max(
        0,
        ...ALGORITHMS.map(({ key }) => solveResults[key]?.trace?.length || 0),
      );
      engine.setMaxSteps(maxSteps);
      setHealth('Online');
      return solveResults;
    } catch (requestError) {
      setHealth('Offline');
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.error || 'The solver could not reach the backend.'
        : 'The solver returned an unexpected error.';
      setError(message);
      throw requestError;
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleGenerateAndSolve = async () => {
    setLoading(true);
    setError('');
    setIsEditing(false);
    engine.pause();
    engine.reset();
    engine.setMaxSteps(0);
    setResults(null);

    try {
      const parsedSeed = seed.trim() === '' ? undefined : Number(seed);
      const genRes = await axios.post(`${API_URL}/generate`, {
        rows: gridSize,
        cols: gridSize,
        density,
        pattern,
        seed: parsedSeed,
      });
      const newMaze = genRes.data as Maze;
      setMaze(newMaze);
      await solveBoard(newMaze, false);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) setHealth('Offline');
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.error || 'Unable to generate a board. Check that the backend is running.'
        : 'Unable to generate a board. Check that the backend is running.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSolveCurrent = async () => {
    if (!maze || loading) return;
    setIsEditing(false);
    try {
      await solveBoard(maze);
    } catch {
      // solveBoard already exposes the actionable message in the UI.
    }
  };

  const handleCellEdit = (row: number, col: number) => {
    if (!maze || loading) return;

    setMaze((currentMaze) => {
      if (!currentMaze) return currentMaze;
      const isStart = currentMaze.start[0] === row && currentMaze.start[1] === col;
      const isGoal = currentMaze.goal[0] === row && currentMaze.goal[1] === col;
      const nextGrid = currentMaze.grid.map((gridRow) => [...gridRow]);
      let nextStart = currentMaze.start;
      let nextGoal = currentMaze.goal;

      if (editMode === 'wall') {
        if (isStart || isGoal) return currentMaze;
        nextGrid[row][col] = 1;
      } else if (editMode === 'erase') {
        nextGrid[row][col] = 0;
      } else if (editMode === 'start') {
        if (isGoal) return currentMaze;
        nextGrid[row][col] = 0;
        nextStart = [row, col];
      } else if (editMode === 'goal') {
        if (isStart) return currentMaze;
        nextGrid[row][col] = 0;
        nextGoal = [row, col];
      }

      return { ...currentMaze, grid: nextGrid, start: nextStart, goal: nextGoal };
    });

    setResults(null);
    setError('');
    engine.pause();
    engine.reset();
    engine.setMaxSteps(0);
  };

  const successfulResults = results
    ? ALGORITHMS.map(({ key }) => ({ key, result: results[key] })).filter(({ result }) => result?.success)
    : [];
  const winner = successfulResults.sort((a, b) => a.result.nodes_expanded - b.result.nodes_expanded)[0];
  const solvedCount = successfulResults.length;
  const currentStep = results ? Math.min(engine.currentStep, Math.max(0, engine.maxSteps - 1)) : 0;
  const progressPercent = results && engine.maxSteps > 1
    ? Math.round((currentStep / (engine.maxSteps - 1)) * 100)
    : 0;

  return (
    <div className="app-container">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={20} strokeWidth={2.4} /></div>
          <div>
            <p className="eyebrow">ALGORITHM LAB · 01</p>
            <h1>A* <span>Comparative Visualizer</span></h1>
            <p className="brand-subtitle">See heuristics think in real time.</p>
          </div>
        </div>
        <div className="header-actions">
          <div className={`status ${health === 'Online' ? 'online' : health === 'Checking...' ? 'checking' : 'offline'}`}>
            <span className="status-dot" />
            <span>{health === 'Online' ? 'Engine online' : health === 'Checking...' ? 'Connecting' : 'Engine offline'}</span>
          </div>
          <button
            type="button"
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </header>

      <section className="hero-card glass-panel">
        <div className="hero-copy">
          <div className="section-label"><Activity size={14} /> LIVE PATHFINDING STUDY</div>
          <h2>Make every decision <em>visible.</em></h2>
          <p>Compare four search strategies on the same board, scrub through every expansion, and edit the terrain as you learn.</p>
        </div>
        <div className="hero-facts">
          <div className="hero-fact"><strong>04</strong><span>strategies</span></div>
          <div className="hero-fact"><strong>{gridSize}×{gridSize}</strong><span>active canvas</span></div>
          <div className="hero-fact"><strong>{solvedCount || '—'}</strong><span>routes found</span></div>
        </div>
      </section>

      <section className="control-panel glass-panel">
        <div className="panel-heading">
          <div>
            <div className="section-label"><Settings2 size={14} /> EXPERIMENT SETUP</div>
            <h2>Shape the search space</h2>
          </div>
          <div className="seed-note"><Shuffle size={14} /> {selectedPattern.description}</div>
        </div>

        <div className="control-grid">
          <div className="control-item pattern-control">
            <label htmlFor="pattern">Board pattern</label>
            <select id="pattern" value={pattern} onChange={(event) => setPattern(event.target.value as Pattern)} disabled={loading}>
              {PATTERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="control-item range-control">
            <div className="control-label-row"><label htmlFor="grid-size">Grid size</label><output>{gridSize}×{gridSize}</output></div>
            <input id="grid-size" type="range" min="10" max="40" step="1" value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))} disabled={loading} />
            <div className="range-hints"><span>10</span><span>40</span></div>
          </div>
          <div className="control-item range-control">
            <div className="control-label-row"><label htmlFor="density">Obstacle density</label><output>{Math.round(density * 100)}%</output></div>
            <input id="density" type="range" min="0" max="0.5" step="0.01" value={density} onChange={(event) => setDensity(Number(event.target.value))} disabled={loading} />
            <div className="range-hints"><span>Open</span><span>Dense</span></div>
          </div>
          <div className="control-item seed-control">
            <label htmlFor="seed">Random seed <span>optional</span></label>
            <input id="seed" type="number" inputMode="numeric" placeholder="Random" value={seed} onChange={(event) => setSeed(event.target.value)} disabled={loading} />
          </div>
          <button type="button" className="btn-primary generate-btn" onClick={handleGenerateAndSolve} disabled={loading}>
            <Wand2 size={17} />
            {loading ? 'Running study…' : 'Generate & solve'}
          </button>
        </div>

        {maze && (
          <div className="workspace-toolbar">
            <div className="toolbar-group editor-group">
              <div className="toolbar-title"><Pencil size={14} /> EDIT BOARD</div>
              <button type="button" className={`tool-btn ${isEditing && editMode === 'wall' ? 'active' : ''}`} onClick={() => { setIsEditing(true); setEditMode('wall'); }} disabled={loading}><span className="tool-swatch wall-swatch" /> Wall</button>
              <button type="button" className={`tool-btn ${isEditing && editMode === 'erase' ? 'active' : ''}`} onClick={() => { setIsEditing(true); setEditMode('erase'); }} disabled={loading}><Eraser size={15} /> Erase</button>
              <button type="button" className={`tool-btn ${isEditing && editMode === 'start' ? 'active' : ''}`} onClick={() => { setIsEditing(true); setEditMode('start'); }} disabled={loading}><Target size={15} /> Start</button>
              <button type="button" className={`tool-btn ${isEditing && editMode === 'goal' ? 'active' : ''}`} onClick={() => { setIsEditing(true); setEditMode('goal'); }} disabled={loading}><Flag size={15} /> Goal</button>
              {isEditing && <button type="button" className="text-btn" onClick={() => setIsEditing(false)}>Done</button>}
            </div>
            <div className="toolbar-tip">
              <MousePointer2 size={14} /> {isEditing ? 'Click or drag across any grid to edit' : 'Edit the terrain to create your own challenge'}
            </div>
            <button type="button" className="secondary-btn solve-btn" onClick={handleSolveCurrent} disabled={loading || !maze}>
              <RotateCcw size={15} /> Re-run comparison
            </button>
          </div>
        )}

        <div className="playback-toolbar">
          <div className="playback-buttons">
            <button type="button" className="play-btn" onClick={engine.isPlaying ? engine.pause : engine.play} disabled={!results || loading}>
              {engine.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {engine.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="icon-btn" onClick={engine.reset} disabled={!results || loading}><RotateCcw size={16} /> Reset</button>
            <span className="toolbar-divider" />
            <button type="button" className="icon-btn" onClick={engine.stepBackward} disabled={!results || loading || currentStep === 0}><SkipBack size={16} /> Back</button>
            <button type="button" className="icon-btn" onClick={engine.stepForward} disabled={!results || loading || currentStep >= engine.maxSteps - 1}><SkipForward size={16} /> Forward</button>
          </div>
          <div className="speed-control">
            <div className="control-label-row"><label htmlFor="speed">Playback speed</label><output>{speedMultiplier.toFixed(2)}×</output></div>
            <input id="speed" type="range" min="0.25" max="5" step="0.25" value={speedMultiplier} onChange={(event) => setSpeedMultiplier(Number(event.target.value))} />
          </div>
          <div className="playback-progress">
            <div className="progress-meta"><span>TRACE PROGRESS</span><strong>{results ? `${currentStep} / ${Math.max(0, engine.maxSteps - 1)}` : '—'}</strong></div>
            <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert"><AlertCircle size={17} /><span>{error}</span></div>
      )}

      {!maze ? (
        <section className="empty-state glass-panel">
          <div className="empty-orbit"><Sparkles size={32} /></div>
          <div className="section-label">READY WHEN YOU ARE</div>
          <h2>Build a board worth exploring.</h2>
          <p>Choose a pattern, tune the density, then watch each heuristic reveal its strategy one node at a time.</p>
          <button type="button" className="btn-primary" onClick={handleGenerateAndSolve} disabled={loading}><Wand2 size={17} /> Generate a sample board</button>
          <div className="shortcut-note"><Keyboard size={14} /> Space play/pause · ← → step · R reset</div>
        </section>
      ) : (
        <main className="visualizer-section">
          <div className="board-toolbar">
            <div>
              <div className="section-label"><CheckCircle2 size={14} /> COMPARISON BOARD</div>
              <h2>{activePattern.label}<span> · {maze.grid.length}×{maze.grid[0].length}</span></h2>
            </div>
            <div className="board-meta"><span className="meta-pill">{Math.round((maze.density ?? density) * 100)}% density</span><span className="meta-pill">{maze.seed ?? 'random seed'}</span></div>
          </div>

          {results && (
            <section className="insights-grid">
              <div className="insight-card insight-winner">
                <div className="insight-icon"><Target size={18} /></div>
                <div><span className="insight-label">MOST EFFICIENT TRACE</span><strong>{winner ? ALGORITHMS.find(({ key }) => key === winner.key)?.short : 'Calculating…'}</strong><small>{winner ? `${winner.result.nodes_expanded} nodes expanded` : 'Search in progress'}</small></div>
              </div>
              <div className="insight-card">
                <div className="insight-icon"><Activity size={18} /></div>
                <div><span className="insight-label">TRACE FRAME</span><strong>{progressPercent}%</strong><small>{engine.isPlaying ? 'Playback running' : 'Playback paused'}</small></div>
              </div>
              <div className="insight-card">
                <div className="insight-icon"><Sparkles size={18} /></div>
                <div><span className="insight-label">ROUTE STATUS</span><strong>{solvedCount}/4 found</strong><small>{winner ? `Best path: ${winner.result.path.length} steps` : 'No route yet'}</small></div>
              </div>
            </section>
          )}

          <Legend />
          <div className="editing-banner" aria-live="polite">
            <span className={`edit-indicator ${isEditing ? 'active' : ''}`} />
            {isEditing ? <><strong>Editing {editMode}</strong> — changes clear the current comparison. Re-run when ready.</> : <>Tip: select an edit tool above to paint directly on every grid.</>}
          </div>
          <div className="grids-wrapper">
            {ALGORITHMS.map(({ key, title }) => {
              const result = results?.[key];
              const traceLength = result?.trace?.length || 0;
              const stepIndex = Math.min(currentStep, Math.max(0, traceLength - 1));
              const isFinished = Boolean(result && traceLength > 0 && stepIndex >= traceLength - 1 && !engine.isPlaying);

              return (
                <GridVisualizer
                  key={key}
                  title={title}
                  grid={maze.grid}
                  start={maze.start}
                  goal={maze.goal}
                  path={isFinished ? result?.path : undefined}
                  trace={result?.trace}
                  stepIndex={stepIndex}
                  success={result?.success}
                  isFinished={isFinished}
                  theme={theme}
                  interactive={isEditing && !loading}
                  onCellEdit={handleCellEdit}
                  finalStats={result ? {
                    nodesExpanded: result.nodes_expanded,
                    executionTimeMs: result.execution_time_ms,
                    pathCost: result.path_cost,
                  } : undefined}
                />
              );
            })}
          </div>
        </main>
      )}

      <footer className="app-footer"><span>A visual study of informed search</span><span>Built for curiosity · {new Date().getFullYear()}</span></footer>
      <SpeedInsights />
      <Analytics />
    </div>
  );
}

export default App;
