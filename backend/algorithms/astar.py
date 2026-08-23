import heapq
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
    
    start_tuple = tuple(start)
    goal_tuple = tuple(goal)
    
    heuristic = HEURISTICS.get(heuristic_name, HEURISTICS['zero'])
    
    frontier = []
    heapq.heappush(frontier, (0, start_tuple))
    
    came_from = {}
    g_score = {start_tuple: 0}
    f_score = {start_tuple: heuristic(start_tuple, goal_tuple)}
    
    visited_set = set()
    frontier_set = {start_tuple}
    
    trace = []
    nodes_expanded = 0
    start_time = time.perf_counter()
    
    while frontier:
        current_f, current = heapq.heappop(frontier)
        frontier_set.discard(current)
        
        # Record trace
        trace.append({
            'current': current,
            'frontier': list(frontier_set),
            'visited': list(visited_set),
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
                
                if neighbor not in frontier_set:
                    heapq.heappush(frontier, (f_score[neighbor], neighbor))
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
