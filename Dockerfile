FROM nice/ld-docker-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/owldin/ /owldin/
ADD tools/ /tools/

RUN \
   apt-get install -yy npm && \
   ln -s /usr/bin/nodejs /usr/bin/node && \
   mozroots --import --sync && \
   cd /tools && \
   ./install.sh && \
   cd /owldin && \
   npm install

ENV PROJECT_DIR="/git"
ENV MIMIR_PORT=80

EXPOSE  80
CMD ["node", "/owldin/server.js"]
