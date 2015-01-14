#!/bin/bash

docker build -t "nice/ldci" docker/build/
docker kill ldci 
docker rm ldci
docker run -d --name linkeddatabuild -v $(pwd):/src -t nice/ldci

