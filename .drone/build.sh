#!/bin/bash
set -e  
cd $DRONE_BUILD_DIR


./build.sh 


wrapdocker &  
sleep 5

echo docker login -e $1 -u $2 -p $3
docker build -t nice/mimir .  
docker push nice/mimir ../
./build.sh 
