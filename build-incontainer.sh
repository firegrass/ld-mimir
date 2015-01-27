#!/bin/bash

./development-container.sh
docker exec ld-docker-build build.sh
