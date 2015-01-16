#!/bin/bash

docker build -t "nice/ldci" docker/develop/
docker kill ldci 
docker rm ldci
docker run -d --name ldci -v $(pwd):/src/ -t nice/ldci

