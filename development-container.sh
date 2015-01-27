#!/bin/bash

docker kill ld-docker-build
docker rm ld-docker-build
docker run -d --name ld-docker-build -v $(pwd):/ -t nice/ld-docker-build

