FROM nice/linkeddata-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD src/gore.io/ /gore.io/

EXPOSE  80
CMD ["node", "/gore.io/server.js","--project","/tmp","--port","80"]
