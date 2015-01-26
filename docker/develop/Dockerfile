FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

RUN apt-get update && apt-get install -y \
    mono-devel \
    libtool \
    autoconf \
    g++ \
    gettext \
    make \
    git \
    wget \
    htop \
    pandoc
    
RUN git clone https://github.com/mono/mono && \
    cd mono && \
    git checkout mono-3.10.0-branch && \
    ./autogen.sh   --prefix /usr && \
    make && \
    make install && \
    cd / && rm -rf mono

RUN apt-get install -y autoconf libtool pkg-config make git && \
    git clone https://github.com/fsharp/fsharp && \
    cd fsharp && ./autogen.sh --prefix /usr && make && make install && \
    cd / && rm -rf fsharp

RUN mozroots -sync --quiet

RUN apt-get install -y nodejs npm &&\
    npm install -g grunt &&\
    ln /usr/bin/nodejs /usr/bin/node

RUN git config --global core.autocrlf true
