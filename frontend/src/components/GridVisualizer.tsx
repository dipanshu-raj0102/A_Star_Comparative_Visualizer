import React, { useEffect, useMemo, useRef } from 'react';

type Point = [number, number];
type Theme = 'dark' | 'light';

type GridVisualizerProps = {
  title: string;
  grid: number[][];
  start: Point;
  goal: Point;
  path?: Point[];
  trace?: any[];
  stepIndex?: number;
  finalStats?: {
    nodesExpanded: number;
    executionTimeMs: number;
    pathCost: number;
  };
  success?: boolean;
  isFinished?: boolean;
  theme?: Theme;
  interactive?: boolean;
  onCellEdit?: (row: number, col: number) => void;
};

type CanvasColors = {
  wall: string;
  empty: string;
  start: string;
  goal: string;
  visited: string;
  frontier: string;
  current: string;
  path: string;
  gridLine: string;
  text: string;
  currentText: string;
};

const EMPTY_PATH: Point[] = [];
const EMPTY_TRACE: any[] = [];
const EMPTY_POINTS: Point[] = [];

const COLORS: Record<Theme, CanvasColors> = {
  dark: {
    wall: '#1d2b43',
    empty: '#0b1426',
    start: '#19c69a',
    goal: '#ff5c70',
    visited: 'rgba(22, 126, 183, 0.42)',
    frontier: 'rgba(239, 155, 54, 0.72)',
    current: '#ffe38a',
    path: '#a66cff',
    gridLine: 'rgba(148, 163, 184, 0.10)',
    text: 'rgba(226, 232, 240, 0.78)',
    currentText: '#1d2330',
  },
  light: {
    wall: '#cbd5e1',
    empty: '#f8fafc',
    start: '#059669',
    goal: '#e11d48',
    visited: 'rgba(14, 116, 144, 0.25)',
    frontier: 'rgba(217, 119, 6, 0.48)',
    current: '#fbbf24',
    path: '#7c3aed',
    gridLine: 'rgba(30, 41, 59, 0.12)',
    text: 'rgba(30, 41, 59, 0.76)',
    currentText: '#ffffff',
  },
};

const GridVisualizer: React.FC<GridVisualizerProps> = ({
  title,
  grid,
  start,
  goal,
  path = EMPTY_PATH,
  trace = EMPTY_TRACE,
  stepIndex = -1,
  finalStats,
  success = true,
  isFinished = false,
  theme = 'dark',
  interactive = false,
  onCellEdit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = grid?.length ?? 0;
  const cols = rows > 0 ? grid[0].length : 0;
  const traceItem = stepIndex >= 0 && stepIndex < trace.length ? trace[stepIndex] : null;
  const visited = traceItem?.visited ?? EMPTY_POINTS;
  const frontier = traceItem?.frontier ?? EMPTY_POINTS;
  const current = traceItem?.current || null;

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
  const displayTime = finalStats ? `${finalStats.executionTimeMs.toFixed(2)}ms` : '--';
  const displayPathLen = isFinished ? (success ? path.length : '—') : '—';

  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    if (stepIndex >= 0) {
      for (let index = 0; index <= stepIndex; index += 1) {
        const tracePoint = trace[index];
        if (tracePoint?.current && tracePoint.f !== undefined) {
          map.set(`${tracePoint.current[0]},${tracePoint.current[1]}`, tracePoint.f);
        }
      }
    }
    return map;
  }, [trace, stepIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rows || !cols) return undefined;

    const colors = COLORS[theme];
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;

      const dpr = window.devicePixelRatio || 1;
      const size = rect.width;
      canvas.width = Math.max(1, Math.floor(size * dpr));
      canvas.height = Math.max(1, Math.floor(size * dpr));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cellW = size / cols;
      const cellH = size / rows;
      const radius = Math.min(cellW, cellH) * 0.16;
      const visitedSet = new Set(visited.map((point: Point) => `${point[0]},${point[1]}`));
      const frontierSet = new Set(frontier.map((point: Point) => `${point[0]},${point[1]}`));

      ctx.fillStyle = colors.empty;
      ctx.fillRect(0, 0, size, size);

      const drawCell = (x: number, y: number, color: string, glowing = false) => {
        ctx.fillStyle = color;
        if (glowing) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.max(7, cellW * 0.42);
        }
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + 1, y + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2), radius);
        } else {
          ctx.rect(x + 1, y + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * cellW;
          const y = row * cellH;
          if (grid[row][col] === 1) {
            drawCell(x, y, colors.wall);
          } else {
            ctx.strokeStyle = colors.gridLine;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }
      }

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (grid[row][col] === 1) continue;
          const key = `${row},${col}`;
          if (frontierSet.has(key)) {
            drawCell(col * cellW, row * cellH, colors.frontier);
          } else if (visitedSet.has(key)) {
            drawCell(col * cellW, row * cellH, colors.visited);
          }
        }
      }

      if (path.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = colors.path;
        ctx.lineWidth = Math.max(3, Math.min(cellW, cellH) * 0.34);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = colors.path;
        ctx.shadowBlur = Math.max(8, cellW * 0.52);

        path.forEach(([row, col], index) => {
          const centerX = col * cellW + cellW / 2;
          const centerY = row * cellH + cellH / 2;
          if (index === 0) ctx.moveTo(centerX, centerY);
          else ctx.lineTo(centerX, centerY);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      drawCell(start[1] * cellW, start[0] * cellH, colors.start, true);
      drawCell(goal[1] * cellW, goal[0] * cellH, colors.goal, true);

      if (
        current &&
        !(current[0] === start[0] && current[1] === start[1]) &&
        !(current[0] === goal[0] && current[1] === goal[1])
      ) {
        drawCell(current[1] * cellW, current[0] * cellH, colors.current, true);
      }

      ctx.font = `600 ${Math.max(8, cellW * 0.34)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (grid[row][col] === 1) continue;
          const cost = costMap.get(`${row},${col}`);
          const isStart = start[0] === row && start[1] === col;
          const isGoal = goal[0] === row && goal[1] === col;
          const isCurrent = current && current[0] === row && current[1] === col;
          if (cost !== undefined && !isStart && !isGoal && (isCurrent || cellW > 15)) {
            ctx.fillStyle = isCurrent ? colors.currentText : colors.text;
            ctx.fillText(Math.round(cost).toString(), col * cellW + cellW / 2, row * cellH + cellH / 2);
          }
        }
      }
    };

    render();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(render) : null;
    observer?.observe(canvas);
    window.addEventListener('resize', render);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', render);
    };
  }, [cols, costMap, current, frontier, goal, grid, path, rows, start, theme, trace, visited]);

  const cellFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rows || !cols) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  };

  const editFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !onCellEdit || event.buttons !== 1) return;
    const cell = cellFromPointer(event);
    if (cell) onCellEdit(cell.row, cell.col);
  };

  if (!grid || !rows || !cols) return <div className="no-grid">No grid data</div>;

  return (
    <div className="grid-container">
      <div className="grid-header">
        <div className="grid-title-row">
          <div>
            <p className="grid-kicker">HEURISTIC PROFILE</p>
            <h3>{title}</h3>
          </div>
          {isFinished && (
            <div className={`status-badge ${success ? 'success' : 'unreachable'}`}>
              {success ? 'Solved' : 'No route'}
            </div>
          )}
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
      <div className={`canvas-wrapper ${interactive ? 'is-interactive' : ''}`}>
        <canvas
          ref={canvasRef}
          className="grid-canvas"
          role="img"
          aria-label={`${title} pathfinding grid`}
          onPointerDown={(event) => {
            if (!interactive || !onCellEdit) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            const cell = cellFromPointer(event);
            if (cell) onCellEdit(cell.row, cell.col);
          }}
          onPointerMove={editFromPointer}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>
    </div>
  );
};

export default GridVisualizer;
