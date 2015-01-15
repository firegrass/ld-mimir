#!/bin/bash


./development-container.sh
docker exec ldci /bin/sh -c 'cd /src;./build.sh'
