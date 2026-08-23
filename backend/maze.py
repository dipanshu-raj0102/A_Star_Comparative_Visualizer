import random

def generate_maze(rows, cols, obstacle_density, seed=None):
    if seed is not None:
        random.seed(seed)
        
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    
    start = (0, 0)
    goal = (rows - 1, cols - 1)
    
    for r in range(rows):
        for c in range(cols):
            if (r, c) == start or (r, c) == goal:
                continue
            if random.random() < obstacle_density:
                grid[r][c] = 1
                
    return grid, start, goal
