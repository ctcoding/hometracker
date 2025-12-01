#!/bin/bash
set -e

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="/var/www/hometracker"
SERVER_DIR="$PROJECT_DIR/server"

echo -e "${BLUE}Starting deployment...${NC}"

# 1. Git pull
echo -e "${BLUE}Pulling latest changes from GitHub...${NC}"
cd "$PROJECT_DIR"
sudo -u hometracker git pull origin main

# 2. Install frontend dependencies if package.json changed
if sudo -u hometracker git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    sudo -u hometracker npm install
fi

# 3. Build frontend
echo -e "${BLUE}Building frontend...${NC}"
sudo -u hometracker npm run build

# 4. Install backend dependencies if package.json changed
if sudo -u hometracker git diff --name-only HEAD@{1} HEAD | grep -q "server/package.json"; then
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd "$SERVER_DIR"
    sudo -u hometracker npm install
fi

# 5. Build backend
echo -e "${BLUE}Building backend...${NC}"
cd "$SERVER_DIR"
sudo -u hometracker npm run build

# 6. Restart backend service
echo -e "${BLUE}Restarting hometracker service...${NC}"
sudo systemctl restart hometracker

# 7. Kill any running Vite dev servers
echo -e "${BLUE}Stopping Vite dev servers (if any)...${NC}"
pkill -f "vite.*--port 5273" || true

# 8. Verify service is running
sleep 2
if systemctl is-active --quiet hometracker; then
    echo -e "${GREEN}✓ Backend service is running${NC}"
else
    echo -e "${RED}✗ Backend service failed to start${NC}"
    sudo journalctl -u hometracker -n 50 --no-pager
    exit 1
fi

# 9. Test backend
echo -e "${BLUE}Testing backend API...${NC}"
if curl -s -f http://localhost:3331/api/readings > /dev/null; then
    echo -e "${GREEN}✓ Backend API is responding${NC}"
else
    echo -e "${RED}✗ Backend API is not responding${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}Frontend: https://hometracker.tiehs.de${NC}"
echo -e "${BLUE}Backend: http://localhost:3331${NC}"
