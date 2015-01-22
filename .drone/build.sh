#!/bin/bash
echo $(env)
set -e  
cd $DRONE_BUILD_DIR


./build.sh 


wrapdocker &  
sleep 5

docker login -e $DRONE_DOCKERHUB_EMAIL -u $DRONE_DOCKERHUB_USER -p $DRONE_DOCKERHUB_PASS
docker build -t nice/mimir .  
docker push nice/mimir ../
./build.sh 
