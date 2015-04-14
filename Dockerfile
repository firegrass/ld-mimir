FROM nice/ld-docker-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/owldin/ /owldin/
ADD tools/ /tools/


RUN apt-get update && apt-get install -yy git graphviz raptor-utils python make g++ inotify-tools

RUN apt-get install -y nodejs npm &&\
    npm install -g grunt &&\
    ln /usr/bin/nodejs /usr/bin/node

#Explicitly adding package.json should cache this layer if it hasn't changed
#See http://www.clock.co.uk/blog/a-guide-on-how-to-cache-npm-install-with-docker
ADD src/owldin/package.json /owldin/
RUN cd /owldin && \
    npm install

# Same trick with paket.lock
ADD tools/paket.lock /tools/
RUN cd /tools && \
    ./install.sh

ENV PROJECT_DIR="/git"
ENV MIMIR_PORT=80

EXPOSE  80
CMD ["node", "/owldin/server.js"]
