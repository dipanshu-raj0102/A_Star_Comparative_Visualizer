import React, { useEffect, useRef, useMemo } from 'react';

type GridVisualizerProps = {
  title: string;
  grid: number[][];
  start: [number, number];
  goal: [number, number];
  path?: [number, number][];
  trace?: any[];
  stepIndex?: number;
  finalStats?: {
    nodesExpanded: number;
    executionTimeMs: number;
    pathCost: number;
  };
  isFinished?: boolean;
};

const COLORS = {
  wall: '#1e293b',       // Softer slate for walls
  empty: '#0f172a',      // Base background
  start: '#10b981',      // Emerald
  goal: '#ef4444',       // Red
  visited: 'rgba(3, 105, 161, 0.4)',  // Translucent Sky blue
  frontier: 'rgba(217, 119, 6, 0.6)', // Translucent Amber
  current: '#fef08a',    // Bright yellow
  path: '#a855f7',       // Purple glow
  gridLine: 'rgba(255, 255, 255, 0.03)',
  text: 'rgba(255, 255, 255, 0.7)',
  currentText: '#000000'
};

const GridVisualizer: React.FC<GridVisualizerProps> = ({
  title,
  grid,
  start,
  goal,
  path = [],
  trace = [],
  stepIndex = -1,
  finalStats,
  isFinished = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!grid || grid.length === 0) return <div>No grid data</div>;

  const rows = grid.length;
  const cols = grid[0].length;
  
  // Extract state at current step safely
  const traceItem = stepIndex >= 0 && stepIndex < trace.length ? trace[stepIndex] : null;
  const visited = traceItem?.visited || [];
  const frontier = traceItem?.frontier || [];
  const current = traceItem?.current || null;

  // Live stats calculation
  const liveExpanded = visited.length;
  const liveFrontier = frontier.length;
  const liveCostG = traceItem?.g || 0;
  const liveCostH = traceItem?.h || 0;
  const liveCostF = traceItem?.f || 0;
  
  const displayExpanded = isFinished && finalStats ? finalStats.nodesExpanded : liveExpanded;
  const displayFrontier = isFinished ? 0 : liveFrontier;
  const displayCostG = isFinished && finalStats ? finalStats.pathCost : liveCostG;
  const displayCostH = isFinished ? 0 : liveCostH;
  const displayCostF = isFinished && finalStats ? finalStats.pathCost : liveCostF;
  const displayTime = finalStats ? finalStats.executionTimeMs.toFixed(2) + 'ms' : '--';
  const displayPathLen = isFinished && path ? path.length : '--';

  // Compute cost map for F values
  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    if (stepIndex >= 0) {
      for (let i = 0; i <= stepIndex; i++) {
        const t = trace[i];
        if (t && t.current && t.f !== undefined) {
          map.set(`${t.current[0]},${t.current[1]}`, t.f);
        }
      }
    }
    return map;
  }, [trace, stepIndex]);

  // Canvas Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize by disabling alpha on root
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.width * dpr; 
    ctx.scale(dpr, dpr);

    const cellW = rect.width / cols;
    const cellH = rect.width / rows;
    const radius = Math.min(cellW, cellH) * 0.15; // Rounded corners for cells

    // Fast lookups
    const visitedSet = new Set(visited.map((p: any) => `${p[0]},${p[1]}`));
    const frontierSet = new Set(frontier.map((p: any) => `${p[0]},${p[1]}`));

    // Base background
    ctx.fillStyle = COLORS.empty;
    ctx.fillRect(0, 0, rect.width, rect.width);

    // Helper to draw rounded rects (polyfill for older browsers if needed, but roundRect is standard now)
    const drawCell = (x: number, y: number, color: string, isGlowing = false) => {
      ctx.fillStyle = color;
      if (isGlowing) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + 1, y + 1, cellW - 2, cellH - 2, radius);
      } else {
        ctx.rect(x + 1, y + 1, cellW - 2, cellH - 2);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // 1. Draw Grid Base (Walls, Empty)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW;
        const y = r * cellH;

        if (grid[r][c] === 1) {
          drawCell(x, y, COLORS.wall);
        } else {
          // Subtle grid lines
          ctx.strokeStyle = COLORS.gridLine;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      }
    }

    // 2. Draw Exploration States (Visited, Frontier)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) continue;
        const key = `${r},${c}`;
        const x = c * cellW;
        const y = r * cellH;

        if (frontierSet.has(key)) {
          drawCell(x, y, COLORS.frontier);
        } else if (visitedSet.has(key)) {
          drawCell(x, y, COLORS.visited);
        }
      }
    }

    // 3. Draw Path as a Smooth Continuous Line
    if (path.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = COLORS.path;
      ctx.lineWidth = Math.min(cellW, cellH) * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = COLORS.path;
      ctx.shadowBlur = 10;
      
      for (let i = 0; i < path.length; i++) {
        const [r, c] = path[i];
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4. Draw Start, Goal, and Current overlays
    const drawSpecial = (r: number, c: number, color: string, glow: boolean) => {
      drawCell(c * cellW, r * cellH, color, glow);
    };

    drawSpecial(start[0], start[1], COLORS.start, true);
    drawSpecial(goal[0], goal[1], COLORS.goal, true);

    if (current && !(current[0] === start[0] && current[1] === start[1]) && !(current[0] === goal[0] && current[1] === goal[1])) {
      drawSpecial(current[0], current[1], COLORS.current, true);
    }

    // 5. Draw Costs
    ctx.font = `600 ${Math.max(8, cellW * 0.35)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) continue;
        const key = `${r},${c}`;
        const cost = costMap.get(key);
        
        const isS = start[0] === r && start[1] === c;
        const isG = goal[0] === r && goal[1] === c;
        const isC = current && current[0] === r && current[1] === c;

        if (cost !== undefined && !isS && !isG) {
          const x = c * cellW + cellW / 2;
          const y = r * cellH + cellH / 2;
          
          if (isC) {
            ctx.fillStyle = COLORS.currentText;
            ctx.fillText(Math.round(cost).toString(), x, y);
          } else if (cellW > 15) { // Only draw text if cell is large enough
            ctx.fillStyle = COLORS.text;
            ctx.fillText(Math.round(cost).toString(), x, y);
          }
        }
      }
    }
  }, [grid, cols, rows, start, goal, path, visited, frontier, current, costMap]);

  return (
    <div className="grid-container">
      <div className="grid-header">
        <div className="grid-title-row">
          <h3>{title}</h3>
          {isFinished && <div className="status-badge success">Solved</div>}
        </div>
        <div className="stats-panel">
          <div className="stat-group">
            <div className="stat-item"><span className="stat-label">EXPANDED</span><span className="stat-value">{displayExpanded}</span></div>
            <div className="stat-item"><span className="stat-label">FRONTIER</span><span className="stat-value">{displayFrontier}</span></div>
            <div className="stat-item"><span className="stat-label">LENGTH</span><span className="stat-value">{displayPathLen}</span></div>
            <div className="stat-item"><span className="stat-label">TIME</span><span className="stat-value highlight-time">{displayTime}</span></div>
          </div>
          <div className="stat-group stat-group-costs">
            <div className="stat-item stat-cost"><span className="stat-label">g(n) COST</span><span className="stat-value">{displayCostG}</span></div>
            <div className="stat-item stat-cost"><span className="stat-label">h(n) HEURISTIC</span><span className="stat-value">{Math.round(displayCostH)}</span></div>
            <div className="stat-item stat-cost highlight"><span className="stat-label">f(n) TOTAL</span><span className="stat-value">{Math.round(displayCostF)}</span></div>
          </div>
        </div>
      </div>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
    </div>
  );
};

export default GridVisualizer;
