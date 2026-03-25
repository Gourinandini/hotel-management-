@echo off
echo Starting Hotel Management System Services...
echo ==========================================

echo [1/6] Launching Databases and Kafka via Docker...
docker compose up -d

echo [2/6] Launching Booking API (Port 3001)...
start cmd /k "title Booking API && npm run start:backend"

echo [3/6] Launching Search API (Port 3002)...
start cmd /k "title Search API && npm run start:search-api"

echo [4/6] Launching CDC Publisher...
start cmd /k "title CDC Publisher && npm run start:cdc-publisher"

echo [5/6] Launching CDC Subscriber...
start cmd /k "title CDC Subscriber && npm run start:cdc-subscriber"

echo [6/6] Launching React Frontend (Port 5173)...
start cmd /k "title React Frontend && npm run start:frontend"

echo ==========================================
echo All services have been launched in separate terminal windows!
echo You can now access the frontend at http://localhost:5173 
echo Feel free to close this window.
