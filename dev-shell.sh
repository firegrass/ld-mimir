#!/bin/bash

docker exec --name ld-docker-build -v $(pwd):/ -i -t nice/ld-docker-build /bin/bash
