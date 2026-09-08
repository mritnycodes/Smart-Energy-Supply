# SRM Ramapuram Smart Institutional Microgrid Simulator

An interactive microgrid simulation platform built using React and Node.js/Express. It models automated power load shedding across campus blocks using a 0/1 Knapsack optimization algorithm during main grid outages.

## Project Structure
- **`backend/`**: Node.js & Express server running on Port `5001`. Handles state management, battery discharge telemetry, and the 0/1 Knapsack engine.
- **`frontend/`**: React application running on Port `5173`. Displays spatial campus mapping, real-time power telemetry, and interactive optimizer modal.

---

## How to Run the Project Locally

### 1. Start the Backend Server
Open a terminal in the root directory:
```bash
cd backend
npm install
node server.js
