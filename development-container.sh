#!/bin/bash

docker kill linkeddata-build 
docker rm linkeddata-build
docker run -d --name linkeddata-build -v $(pwd):/src/ -t nice/linkeddata-build

