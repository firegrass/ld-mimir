FROM nice/linkeddata-app
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

ADD artifacts/gore.io src/

EXPOSE  80
CMD ["node", "/src/gore.io/server.js","--project","/tmp","--port","80"]
