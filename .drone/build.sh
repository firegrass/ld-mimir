#!/bin/bash
set -e  
cd $DRONE_BUILD_DIR


./build.sh 


wrapdocker &  
sleep 5
docker login --email=$DOCKERHUB_EMAIL --username=$DOCKERHUB_USER --password=$DOCKERHUB_PASS
docker build -t nice/mimir .  
docker push nice/mimir ../
./build.sh 
