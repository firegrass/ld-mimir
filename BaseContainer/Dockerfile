FROM nice/ld-docker-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

RUN apt-get update && apt-get install -yy git graphviz raptor-utils python make g++ inotify-tools pandoc texlive-latex-base texlive-fonts-extra texlive-fonts-recommended nodejs npm &&\
    npm install -g grunt &&\
    ln /usr/bin/nodejs /usr/bin/node

