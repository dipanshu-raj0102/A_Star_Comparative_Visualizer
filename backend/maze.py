"""Deterministic, pattern-based board generation for the visualizer."""

import random
from typing import List, Tuple


Grid = List[List[int]]
Point = Tuple[int, int]


def _carve_guaranteed_route(grid: Grid, start: Point, goal: Point, rng: random.Random) -> None:
    """Open a lightly randomized monotonic route so every generated board is playable."""
    row, col = start
    grid[row][col] = 0

    while (row, col) != goal:
        moves = []
        if row < goal[0]:
            moves.append((row + 1, col))
        if col < goal[1]:
            moves.append((row, col + 1))

        row, col = rng.choice(moves)
        grid[row][col] = 0


def _random_field(rows: int, cols: int, density: float, rng: random.Random) -> Grid:
    return [
        [1 if rng.random() < density else 0 for _ in range(cols)]
        for _ in range(rows)
    ]


def _stripe_field(rows: int, cols: int, density: float, rng: random.Random) -> Grid:
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    stripe_gap = max(2, round(4 - density * 3))

    for col in range(1, cols - 1):
        if col % stripe_gap != 0 or rng.random() > min(1, density * 1.8):
            continue
        for row in range(rows):
            if rng.random() < 0.88:
                grid[row][col] = 1

    return grid


def _checker_field(rows: int, cols: int, density: float, rng: random.Random) -> Grid:
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    probability = min(1, density * 2.15)

    for row in range(rows):
        for col in range(cols):
            if (row + col) % 2 == 0 and rng.random() < probability:
                grid[row][col] = 1

    return grid


def _rooms_field(rows: int, cols: int, density: float, rng: random.Random) -> Grid:
    grid = _random_field(rows, cols, density * 0.45, rng)
    room_size = max(3, min(6, round(7 - density * 5)))

    for row in range(1, rows - 1, room_size + 1):
        for col in range(1, cols - 1, room_size + 1):
            if rng.random() > 0.72:
                continue
            height = min(room_size, rows - row - 1)
            width = min(room_size, cols - col - 1)
            for room_row in range(row, row + height):
                for room_col in range(col, col + width):
                    grid[room_row][room_col] = 1

            # Doors keep the rooms readable without making them sealed boxes.
            door_row = row + rng.randrange(max(1, height))
            door_col = col + rng.randrange(max(1, width))
            grid[door_row][col] = 0
            grid[row][door_col] = 0

    return grid


def _spiral_field(rows: int, cols: int, density: float, rng: random.Random) -> Grid:
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    layer_count = max(1, round(min(rows, cols) * (0.12 + density * 0.25)))

    for layer in range(layer_count):
        top = 1 + layer * 2
        left = 1 + layer * 2
        bottom = rows - 2 - layer * 2
        right = cols - 2 - layer * 2
        if top >= bottom or left >= right:
            break

        for col in range(left, right + 1):
            grid[top][col] = 1
            grid[bottom][col] = 1
        for row in range(top, bottom + 1):
            grid[row][left] = 1
            grid[row][right] = 1

        # Offset the opening on each layer to create a spiral-like flow.
        opening_side = layer % 4
        if opening_side == 0:
            grid[top][left + 1] = 0
        elif opening_side == 1:
            grid[top + 1][right] = 0
        elif opening_side == 2:
            grid[bottom][right - 1] = 0
        else:
            grid[bottom - 1][left] = 0

    return grid


def generate_maze(rows, cols, obstacle_density, seed=None, pattern="random"):
    """Generate a board using a named pattern and a local, reproducible RNG.

    The route carve is intentionally applied after the pattern. This keeps the
    visual character of each board while ensuring a generated board can always
    demonstrate a successful search. Users can still create an impossible board
    with the editor by painting over the route.
    """
    rows = int(rows)
    cols = int(cols)
    density = max(0.0, min(0.75, float(obstacle_density)))
    if rows < 2 or cols < 2:
        raise ValueError("rows and cols must be at least 2")

    rng = random.Random(seed)
    start = (0, 0)
    goal = (rows - 1, cols - 1)
    pattern = str(pattern or "random").lower()

    generators = {
        "random": _random_field,
        "stripes": _stripe_field,
        "checkerboard": _checker_field,
        "rooms": _rooms_field,
        "spiral": _spiral_field,
        "clear": lambda r, c, d, randomizer: [[0 for _ in range(c)] for _ in range(r)],
    }
    generator = generators.get(pattern, _random_field)
    grid = generator(rows, cols, density, rng)

    _carve_guaranteed_route(grid, start, goal, rng)
    grid[start[0]][start[1]] = 0
    grid[goal[0]][goal[1]] = 0

    return grid, start, goal
