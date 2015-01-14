FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>
#Node / mono / git
RUN apt-get update
    apt-get install -y nodejs npm git mono-runtime
#Symlink node to nodejs
RUN ln /usr/bin/nodejs /usr/bin/node
#Global npm requirements
RUN npm install -g grunt
