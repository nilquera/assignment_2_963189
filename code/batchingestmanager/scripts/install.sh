#!/bin/bash

if ! which node > /dev/null
then
    echo "Please, install NodeJS before proceeding."
    exit 1
fi

cd "$(dirname "$0")"
mkdir -p ../log 

# DIR="`pwd`/.."
# INDEX="${DIR}/index.js"
# LOGFILE="${DIR}/log/manager.log"

# source ../.env 2>/dev/null

# echo "[Info] Installing batchingestmanager..."

# if [ "$UPLOAD_FREQUENCY" == "d" ]
# then
#     echo "[Info] The manager will be run daily"
#     freq="@daily"
# elif [ "$UPLOAD_FREQUENCY" == "w" ]
# then
#     echo "[Info] The manager will be run weekly"
#     freq="@weekly"
# elif [ "$UPLOAD_FREQUENCY" == "m" ]
# then
#     echo "[Info] The manager will be run monthly"
#     freq="@monthly"
# else
#     echo "Please, specify a UPLOAD_FREQUENCY in a .env file"
#     exit 1
# fi

# crontab -l | { cat; echo 15 13 * * * node \"$INDEX\" > "$LOGFILE"; } | crontab -