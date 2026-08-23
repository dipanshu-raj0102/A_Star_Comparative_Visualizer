import math

def manhattan(node, goal):
    return abs(node[0] - goal[0]) + abs(node[1] - goal[1])

def euclidean(node, goal):
    return math.sqrt((node[0] - goal[0])**2 + (node[1] - goal[1])**2)

def chebyshev(node, goal):
    return max(abs(node[0] - goal[0]), abs(node[1] - goal[1]))

def zero_heuristic(node, goal):
    return 0

HEURISTICS = {
    'manhattan': manhattan,
    'euclidean': euclidean,
    'chebyshev': chebyshev,
    'zero': zero_heuristic
}
