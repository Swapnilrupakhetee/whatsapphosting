#!/bin/bash

# Start Backend in a New Command Prompt
echo "Starting Backend..."
cmd.exe /c "start cmd /k \"cd backend && node server.js\""

# Start Frontend in a New Command Prompt
echo "Starting Frontend..."
cmd.exe /c "start cmd /k \"cd frontend && npm run dev\""

