# Architecture Diagram
Client (React, Vite, HTML5 Canvas) <--> REST API (JSON) <--> Server (Flask, Python 3.12)

# API Documentation
- POST /generate: Generates maze grid.
- POST /solve: Solves maze and returns trace for all 4 heuristics.
- GET /health: Healthcheck.

# Complexity Analysis
A* algorithm complexity: Time O(b^d), Space O(b^d). Heuristics change effective branching factor `b`.
Manhattan is standard for grid with 4-way movement.

# Deployment Guide
Run `docker-compose up --build` to start both frontend and backend.
