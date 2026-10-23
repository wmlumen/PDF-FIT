#!/bin/bash
# start_server.sh - Inicia el servidor backend de SNC_v3
cd "/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3"
export DB_BACKEND=sqlite
export NODE_ENV=development
node server-api.js >> /tmp/server-test.log 2>&1
