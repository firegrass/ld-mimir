---
title: 'Mímir: Semantic Content Pipeline'
---


## So what is it?

We are building a set of tools that can be used together to create and maintain a semantic knowledge base and derived works.

### Engineering versus office model of document production

It is possible to separate approaches to collaboratively constructing documents into two camps [@Plaintext_Please] - the office model and the engineering model. The office model is familiar to most people; a set of tools centered around a word processor and a number of large files are the center of their work. Changes to this work are tracked inside these large files and in various ad-hoc ways. Concurrent editing is difficult unless authors are in the same room and merging changes between different groups working concurrently is usually a manual process. The final output is usually the word processor file without change tracking data, possibly transliterated to formats more suitable for print or web.

In the engineering model, a larger number of plaintext files and a version control system become the center of the project along with a larger suite of more specific tools than a word processor. Changes to these files are tracked externally, in the version control system. Plain text formats are used because of the relative ease of determining the differences between two versions of the same text. Transformation of plain-text is usually performed by different tools than those used for editing it.

### Plain-text

Files that contain markup or other data are generally considered plain-text, as long as the entirety remains in directly human-readable form. Markup formats such as HTML and markdown are also plain-text as Coombs, Renear, and DeRose argue [@Coombs:1987:MSF:32206.32209], punctuation is itself markup. A binary file (such as a JPEG image or a Word Document) is a sequence of bytes which requires interpretation before it can be understood by humans. Some rich text formats such as Microsoft Word's .xdoc are superficially plain-text but are probably better classed as text encoded binary formats as very few humans would be able to make sense of such a document without the application that renders it.

A consideration when choosing between plain-text formats is the ease of resolving conflicts when multiple agents are collaborating on changes to a single file. Line and character oriented differencing algorithms are efficient and well understood. Differencing rich text formats that have structures that span multiple lines such as HTML or XML is more complex. Using textual differencing on these can produce invalid results and relies on users having knowledge of the format to resolve problems. These same constrains apply to the operational transformation algorithms [@Sun98operationaltransformation] that collaborative real-time editors use.


## So what is it?

Plain-text files and a modern version control system can be used to create a content repository and publishing pipeline. Version control history can be translated into standard compliant W3C provenance graphs. Semantics can be embedded in plain-text content directly, inferred from structure, extracted using natural language processing or stored as annotations. Print quality documents and web content can be produced from semantic data as the version control system is updated.

## So what is it?

We are going to try to use similar tools and processes to those we use as developers to produce software to enable NICE to produce semantic content.

### A web based Integrated Development Environment

![Editor](images/editor.png)

### A version control system

Git. 

### A compiler / service

Translates plain-text files into an OWL2 knowledge base. This can be syndicated directly and translated into web / pdf / ebook / etc content.

### A collaboration and project management site

[Gitlab](http://gitlab.com) A github clone we can run behind the firewall.

### A continuous integration process

Probably based around [drone](http://drone.io)

### Orchestration to manage development and CI environments without admin overhead

Environments will be executed in [docker](http://docker.io). This makes creation and update of large numbers of instances of the editor and tool chain possible. It also means we need to deploy to Linux, not windows. 

## What you should probably read before working on this project

Many of the technologies used are likely to be unfamiliar to people with a background in ASP/.NET. Semantic web technology hasn't seen much use in the .NET world at all; mostly it's implemented by specialists using Java.




