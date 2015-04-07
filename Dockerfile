FROM nice/ld-docker-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/owldin/ /owldin/
ADD tools/ /tools/


RUN apt-get install -yy git graphviz raptor-utils python make g++
# Install NVM
RUN git clone https://github.com/creationix/nvm.git /.nvm
RUN echo ". /.nvm/nvm.sh" >> /etc/bash.bashrc

# Install node.js
RUN /bin/bash -c '. /.nvm/nvm.sh && nvm install v0.10.18 && nvm use v0.10.18 && nvm alias default v0.10.18 && ln -s /.nvm/v0.10.18/bin/node /usr/bin/node && ln -s /.nvm/v0.10.18/bin/npm /usr/bin/npm'

# Install package managers
RUN npm install -g sm

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
