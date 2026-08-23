import pytest
from backend.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health(client):
    rv = client.get('/health')
    assert rv.status_code == 200
    assert rv.get_json() == {"status": "healthy"}

def test_generate(client):
    rv = client.post('/generate', json={"rows": 5, "cols": 5, "density": 0.2})
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'grid' in data
    assert 'start' in data
    assert 'goal' in data

def test_solve(client):
    grid = [[0, 0], [0, 0]]
    rv = client.post('/solve', json={"grid": grid, "start": [0,0], "goal": [1,1]})
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'manhattan' in data
    assert 'euclidean' in data
    assert 'chebyshev' in data
    assert 'zero' in data
