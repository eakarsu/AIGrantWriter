#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ports to use
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_PORT=5432

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                                   ║${NC}"
echo -e "${PURPLE}║   ${CYAN}AI Grant Writer - Full Stack Application${PURPLE}                     ║${NC}"
echo -e "${PURPLE}║   ${CYAN}With AI-Powered Features: Matching, Budgets, Impact & More${PURPLE}   ║${NC}"
echo -e "${PURPLE}║                                                                   ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}   Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready &> /dev/null; then
        pg_isready -h localhost -p $DB_PORT &> /dev/null
        return $?
    else
        # Try connecting with psql
        psql -h localhost -p $DB_PORT -U postgres -c '\q' 2>/dev/null
        return $?
    fi
}

# Function to wait for PostgreSQL
wait_for_postgres() {
    echo -e "${BLUE}   Waiting for PostgreSQL to be ready...${NC}"
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if check_postgres; then
            echo -e "${GREEN}   PostgreSQL is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts...${NC}"
        sleep 2
        ((attempt++))
    done

    echo -e "${RED}   PostgreSQL is not responding. Please make sure PostgreSQL is running.${NC}"
    echo -e "${YELLOW}   Try: brew services start postgresql${NC}"
    echo -e "${YELLOW}   Or:  pg_ctl -D /usr/local/var/postgres start${NC}"
    exit 1
}

# Step 1: Clean up ports
echo -e "${BLUE}Step 1: Cleaning up ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}   Ports cleaned${NC}"
echo ""

# Step 2: Check for .env file
echo -e "${BLUE}Step 2: Checking configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}   .env file not found! Creating default configuration...${NC}"
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/grantwriter
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grantwriter
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_for_grant_writer_app_2024
EOF
    echo -e "${YELLOW}   Created .env file. Please update OPENROUTER_API_KEY with your key.${NC}"
fi
echo -e "${GREEN}   Configuration file found${NC}"
echo ""

# Step 3: Check PostgreSQL
echo -e "${BLUE}Step 3: Checking PostgreSQL...${NC}"
wait_for_postgres
echo ""

# Step 4: Create database if it doesn't exist
echo -e "${BLUE}Step 4: Setting up database...${NC}"
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_NAME=${DB_NAME:-grantwriter}
DB_USER=${DB_USER:-postgres}

# Try to create database (will fail silently if exists)
psql -h localhost -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 || {
    echo -e "${YELLOW}   Creating database '$DB_NAME'...${NC}"
    createdb -h localhost -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || {
        psql -h localhost -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    }
}
echo -e "${GREEN}   Database ready${NC}"
echo ""

# Step 5: Install dependencies
echo -e "${BLUE}Step 5: Installing dependencies...${NC}"
echo -e "${CYAN}   Installing backend dependencies...${NC}"
cd backend
npm install --silent 2>/dev/null || npm install
cd ..

echo -e "${CYAN}   Installing frontend dependencies...${NC}"
cd frontend
npm install --silent 2>/dev/null || npm install
cd ..
echo -e "${GREEN}   Dependencies installed${NC}"
echo ""

# Step 6: Seed database
echo -e "${BLUE}Step 6: Seeding database with sample data...${NC}"
cd backend
node seed.js
cd ..
echo ""

# Step 7: Start the application
echo -e "${BLUE}Step 7: Starting application with hot reload...${NC}"
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}   Frontend:  ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}   Backend:   ${CYAN}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "${YELLOW}   Login Credentials:${NC}"
echo -e "${YELLOW}      Email:    demo@grantwriter.com${NC}"
echo -e "${YELLOW}      Password: password123${NC}"
echo ""
echo -e "${CYAN}   Features:${NC}"
echo -e "${CYAN}      - AI Grant Matcher (Match organizations to grants)${NC}"
echo -e "${CYAN}      - AI Budget Builder (Generate budget narratives)${NC}"
echo -e "${CYAN}      - AI Impact Measurer (Create impact frameworks)${NC}"
echo -e "${CYAN}      - AI Deadline Tracker (Analyze & prioritize deadlines)${NC}"
echo -e "${CYAN}      - AI Funder Research (Research funding sources)${NC}"
echo ""
echo -e "${YELLOW}   Hot reload is enabled - changes will auto-refresh${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop all services${NC}"
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reload
echo -e "${CYAN}Starting backend server with hot reload...${NC}"
cd backend
npx nodemon --watch . --ext js,json --ignore node_modules/ server.js &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend with React hot reload (Fast Refresh enabled)
echo -e "${CYAN}Starting frontend with hot reload...${NC}"
cd frontend
FAST_REFRESH=true BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
