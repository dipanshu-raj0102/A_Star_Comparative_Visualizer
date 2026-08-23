import pytest
from backend.algorithms.astar import astar_search
from backend.maze import generate_maze

def test_astar_success():
    grid = [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
    ]
    start = (0, 0)
    goal = (2, 2)
    
    res = astar_search(grid, start, goal, 'manhattan')
    assert res['success'] == True
    assert len(res['path']) > 0

def test_astar_no_path():
    grid = [
        [0, 1, 0],
        [1, 1, 0],
        [0, 0, 0]
    ]
    start = (0, 0)
    goal = (2, 2)
    
    res = astar_search(grid, start, goal, 'manhattan')
    assert res['success'] == False
    assert len(res['path']) == 0

def test_maze_generation():
    grid, start, goal = generate_maze(10, 10, 0.3, seed=42)
    assert len(grid) == 10
    assert len(grid[0]) == 10
    assert start == (0, 0)
    assert goal == (9, 9)
