#!/bin/bash
set -e  
cd $DRONE_BUILD_DIR


./build.sh 


wrapdocker &  
sleep 5

docker build -t nice/mimir .  
docker push nice/mimir ../
./build.sh 
