FROM nice/ld-docker-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/owldin/ /owldin/
ADD tools/ /tools/

RUN \
   mozroots --import --sync && \
   cd /tools && \
   ./install.sh

ENV PROJECT_DIR="/tmp"
ENV MIMIR_PORT=80

EXPOSE  80
CMD ["node", "/owldin/server.js"]
