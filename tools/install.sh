#!/bin/bash

mono .paket/paket.exe restore

ln -s /tools/freya /usr/bin/freya
ln -s /tools/git2prov /usr/bin/git2prov
ln -s /tools/makeworld /usr/bin/makeworld
