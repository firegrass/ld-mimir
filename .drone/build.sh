#!/bin/bash
set -e  
cd /var/cache/drone/src/github/ryansroberts/linkeddata

cd ../
./build.sh 

# As yet unwritten smoke tests

wrapdocker &  
sleep 5

docker build -t nice/mimir .  
docker push nice/mimir ../
./build.sh 
