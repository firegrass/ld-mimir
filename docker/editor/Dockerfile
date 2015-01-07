FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>
RUN apt-get update \
 && apt-get install -y nodejs \
 && ln /usr/bin/nodejs /usr/bin/node 

ADD Gore.io /src

EXPOSE  80
CMD ["node", "/src/server.js","--project","/tmp","--port","80"]