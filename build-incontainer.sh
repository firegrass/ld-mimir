#!/bin/bash

./development-container.sh
docker exec linkeddata-build /bin/sh -c 'cd /src;./build.sh'
