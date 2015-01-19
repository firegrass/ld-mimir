FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>
RUN apt-get update \
 && apt-get install -y nodejs \
 && ln /usr/bin/nodejs /usr/bin/node 
ADD artifacts/gore.io src/

EXPOSE  80
CMD ["node", "/src/gore.io/server.js","--project","/tmp","--port","80"]
