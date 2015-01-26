FROM nice/linkeddata-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/gore.io/ /gore.io/

ENV PROJECT_DIR="/tmp"
ENV MIMIR_PORT = "80"

EXPOSE  80
CMD ["node", "/gore.io/server.js"]
