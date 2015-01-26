FROM phusion/baseimage
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

RUN apt-get update && apt-get install -y \
    mono-devel \
    libtool \
    autoconf \
    g++ \
    gettext \
    make \
    cmake \
    git \
    wget \
    htop \
    pandoc \
    haskell-platform
    
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

RUN mozroots --import --sync  &&\
    certmgr --ssl -m https://go.microsoft.com &&\
    certmgr -ssl -m https://nugetgallery.blob.core.windows.net &&\
    certmgr -ssl -m https://nuget.org

RUN apt-get install -y nodejs npm &&\
    npm install -g grunt &&\
    ln /usr/bin/nodejs /usr/bin/node
    
