from flask import Flask, request, jsonify
from flask_cors import CORS
from maze import generate_maze
from algorithms.astar import astar_search

app = Flask(__name__)
CORS(app, origins="*")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    rows = data.get('rows', 20)
    cols = data.get('cols', 20)
    density = data.get('density', 0.2)
    seed = data.get('seed', None)
    
    grid, start, goal = generate_maze(rows, cols, density, seed)
    return jsonify({
        "grid": grid,
        "start": start,
        "goal": goal
    })

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    grid = data.get('grid')
    start = data.get('start')
    goal = data.get('goal')
    
    if not grid or start is None or goal is None:
        return jsonify({"error": "Missing grid, start, or goal"}), 400
        
    start_tuple = tuple(start)
    goal_tuple = tuple(goal)
    
    results = {}
    for h_name in ['manhattan', 'euclidean', 'chebyshev', 'zero']:
        res = astar_search(grid, start_tuple, goal_tuple, h_name)
        results[h_name] = res
        
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
