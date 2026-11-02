from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from .maze import generate_maze
    from .algorithms.astar import astar_search
except ImportError:
    from maze import generate_maze
    from algorithms.astar import astar_search

app = Flask(__name__)
CORS(app, origins="*")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json(silent=True) or {}
    rows = data.get('rows', 20)
    cols = data.get('cols', rows)
    density = data.get('density', 0.2)
    seed = data.get('seed', None)
    pattern = data.get('pattern', 'random')
    pattern = str(pattern or 'random').lower()
    if pattern not in {'random', 'rooms', 'spiral', 'stripes', 'checkerboard', 'clear'}:
        pattern = 'random'

    try:
        grid, start, goal = generate_maze(rows, cols, density, seed, pattern)
    except (TypeError, ValueError) as error:
        return jsonify({'error': str(error)}), 400

    return jsonify({
        "grid": grid,
        "start": start,
        "goal": goal,
        "pattern": pattern,
        "density": max(0.0, min(0.75, float(density))),
        "seed": seed
    })

@app.route('/solve', methods=['POST'])
def solve():
    data = request.get_json(silent=True) or {}
    grid = data.get('grid')
    start = data.get('start')
    goal = data.get('goal')
    
    if not grid or start is None or goal is None:
        return jsonify({"error": "Missing grid, start, or goal"}), 400
        
    try:
        start_tuple = tuple(start)
        goal_tuple = tuple(goal)
    except TypeError:
        return jsonify({"error": "start and goal must be coordinate pairs"}), 400
    
    results = {}
    try:
        for h_name in ['manhattan', 'euclidean', 'chebyshev', 'zero']:
            res = astar_search(grid, start_tuple, goal_tuple, h_name)
            results[h_name] = res
    except (TypeError, ValueError, IndexError) as error:
        return jsonify({'error': str(error)}), 400
        
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
