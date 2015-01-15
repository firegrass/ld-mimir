FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

RUN apt-get update && apt-get install -y \
    mono-devel \
    libtool \
    autoconf \
    g++ \
    gettext \
    make \
    git
    
RUN git clone https://github.com/mono/mono && \
    cd mono && \ 
    ./autogen.sh   --prefix /usr && \
    make get-monolite-latest && \
    make && \
    make install && \
    cd / && rm -rf mono

RUN apt-get install -y autoconf libtool pkg-config make git && \
    git clone https://github.com/fsharp/fsharp && \
    cd fsharp && ./autogen.sh --prefix /usr && make && make install && \
    cd / && rm -rf fsharp

RUN apt-get install -y nodejs npm &&\
    npm install -g grunt &&\
    ln /usr/bin/nodejs /usr/bin/node

CMD /bin/bash


