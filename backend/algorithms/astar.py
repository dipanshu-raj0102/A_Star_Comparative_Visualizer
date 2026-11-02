import heapq
import itertools
import time
from .heuristics import HEURISTICS

def reconstruct_path(came_from, current):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path

def astar_search(grid, start, goal, heuristic_name):
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0

    if not rows or not cols or any(len(row) != cols for row in grid):
        raise ValueError('grid must be a non-empty rectangle')
    
    start_tuple = tuple(start)
    goal_tuple = tuple(goal)

    for point_name, point in [('start', start_tuple), ('goal', goal_tuple)]:
        if len(point) != 2 or not (0 <= point[0] < rows and 0 <= point[1] < cols):
            raise ValueError(f'{point_name} must be inside the grid')
        if grid[point[0]][point[1]] == 1:
            raise ValueError(f'{point_name} cannot be a wall')
    
    heuristic = HEURISTICS.get(heuristic_name, HEURISTICS['zero'])
    
    frontier = []
    sequence = itertools.count()
    start_h = heuristic(start_tuple, goal_tuple)
    heapq.heappush(frontier, (start_h, start_h, next(sequence), start_tuple))
    
    came_from = {}
    g_score = {start_tuple: 0}
    f_score = {start_tuple: start_h}
    
    visited_set = set()
    frontier_set = {start_tuple}
    
    trace = []
    nodes_expanded = 0
    start_time = time.perf_counter()
    
    while frontier:
        current_f, _, _, current = heapq.heappop(frontier)

        # A node may be inserted more than once when a better route is found.
        # Ignore stale heap entries instead of letting an old priority dictate
        # the visualized search order.
        if current_f > f_score.get(current, float('inf')):
            continue
        frontier_set.discard(current)
        
        # Record trace
        trace.append({
            'current': current,
            'frontier': sorted(frontier_set),
            'visited': sorted(visited_set),
            'g': g_score[current],
            'h': current_f - g_score[current],
            'f': current_f,
            'came_from': {str(k): v for k, v in came_from.items()}
        })
        
        if current == goal_tuple:
            end_time = time.perf_counter()
            path = reconstruct_path(came_from, current)
            return {
                'success': True,
                'path': path,
                'trace': trace,
                'nodes_expanded': nodes_expanded,
                'execution_time_ms': (end_time - start_time) * 1000,
                'path_cost': g_score[current]
            }
            
        visited_set.add(current)
        nodes_expanded += 1
        
        # Get neighbors
        r, c = current
        neighbors = []
        for dr, dc in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                neighbors.append((nr, nc))
                
        for neighbor in neighbors:
            tentative_g_score = g_score[current] + 1
            
            if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                h_val = heuristic(neighbor, goal_tuple)
                f_score[neighbor] = tentative_g_score + h_val

                # Always push an improved score. The stale-entry guard above
                # makes this both correct and inexpensive.
                heapq.heappush(frontier, (f_score[neighbor], h_val, next(sequence), neighbor))
                frontier_set.add(neighbor)
                    
    end_time = time.perf_counter()
    return {
        'success': False,
        'path': [],
        'trace': trace,
        'nodes_expanded': nodes_expanded,
        'execution_time_ms': (end_time - start_time) * 1000,
        'path_cost': 0
    }
