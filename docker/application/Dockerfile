FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>
RUN apt-get update &&\
    apt-get install -y nodejs &&\
    apt-get install -y mono-runtime &&\
    apt-get install pandoc &&\
    ln /usr/bin/nodejs /usr/bin/node 
