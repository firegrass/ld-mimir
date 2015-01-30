---
title: 'Mímir: Semantic Content Pipeline'
---


## So what is it?

We are building a set of tools that can be used together to create and maintain a semantic knowledge base and derived works.

## So what is it?

Plain-text files and a modern version control system can be used to create a content repository and publishing pipeline. Version control history can be translated into standard compliant W3C provenance graphs. Semantics can be embedded in plain-text content directly, inferred from structure, extracted using natural language processing or stored as annotations. Print quality documents and web content can be produced from semantic data as the version control system is updated.

## So what is it?

We are going to try to use similar tools and processes to those we use as developers to produce software to enable NICE to produce semantic content.

### A web based Integrated Development Environment

![Editor](editor.png)

### A version control system

Git. 

### A compiler

Translates plain-text files into an OWL2 knowledge base. This can be syndicated directly and translated into web / pdf / ebook / etc content.

### A collaboration and project management site

[Gitlab](http://gitlab.com) A github clone we can run behind the firewall.

### A continuous integration process

Probably based around [drone](http://drone.io)

### Orchestration to manage development and CI environments without admin overhead

Environments will be executed in [docker](http://docker.io). This makes creation and update of large numbers of instances of the editor and tool chain possible. It also means we need to deploy to Linux, not windows. 

## What you should probably read before working on this project

Many of the technologies used are likely to be unfamiliar to people with a background in ASP/.NET. Semantic web technology hasn't seen much use in the .NET world at all; mostly it's from Java land and used by specialists. 
