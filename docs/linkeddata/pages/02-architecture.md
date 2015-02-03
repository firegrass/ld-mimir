## Architecture

### Principles 

We are building an editor, compiler pipeline and service plus supporting tools for editorial work flow and project management, very similar to something that could produce executable software. The most successful model for this is not the monolithic Visual Studio or Eclipse, but the Makefiles and composable tools used by almost every other platform. This is a classical UNIX architecture, so we can adapt some of its principles to guide us. All design and implementation should comply with the principles outlined below. Any requirement that cannot be implemented without violation of one of more of these principles should be carefully considered.

Consider this a kind of constitution for the development of the system. A net for agile tennis.

#### Isolation

Each editing and compilation environment should be isolated from others.

#### Version control and plain text representation

All input data should be represented as plain text files in a version control system.

#### Idempotence

Operations on data should be repeatable and produce the same results.

#### Immutability

Data should be immutable. Building on isolation, version control and idempotence our data can be partitioned by version.

#### Incremental computation

Components should only re-process the minimum possible amount of input data.

#### Ontology driven 

Compilation and editing components should not be coupled to any particular ontology, only their outputs.

### Current technology selection in terms of these principles 


#### Docker

We require side by side deployment of different versions of the editor, compiler and their dependencies. Until the last few years or so, the only real option for doing this sort of thing would be to use virtual machines. Vagrant would allow us to produce virtual machine instances as build outputs from team city that we could deploy to both servers and laptops. This however comes with a number of problems. Virtual machine instances are large binaries, so incremental deployment is resource hungry, as is re/booting applications. There are also numerous issues around versioning virtual machines and managing dependencies between them. Enter Docker.

>Docker is an open platform for developers and sysadmins to build, ship, and run distributed applications. Consisting of Docker Engine, a portable, lightweight runtime and packaging tool, and Docker Hub, a cloud service for sharing applications and automating workflows, Docker enables apps to be quickly assembled from components and eliminates the friction between development, QA, and production environments. As a result, IT can ship faster and run the same app, unchanged, on laptops, data center VMs, and any cloud.

Docker provides similar capabilities to building virtual machines using vagrant, but has a number of advantages:

 * Portable deployment across machines: you can use Docker to create a single object containing all your bundled applications. This object can then be transferred and quickly installed onto any other Docker-enabled host.
 * Versioning: Docker includes git-like capabilities for tracking successive versions of a container, inspecting the diff between versions, committing new versions, rolling back etc.
 * Component reuse: Docker allows building or stacking of already created packages. For instance, if you need to create several machines that all require Apache and MySQL database, you can create a ‘base image’ containing these two items, then build and create new machines using these already installed.
 * Shared libraries: There is already a public registry (http://index.docker.io/ ) where thousands have already uploaded the useful containers they have created. Again, think of the AWS common pool of different configs and distros – this is very similar.
 * Dependencies: Docker can manage dependencies between containers. So an application container that required redis would discover (and potentially automatically deploy and start) the appropriate services as other containers. This allows us to easily create environments (dev, test, live) etc that will manage all their required dependencies
 * Incremental deployment: Because of the git-like capabilities deployments use small binary diffs rather than complete images 
 * No boot time: Containers have little or no initialisation / shutdown overhead as they don't require a complete operating system. This allows fast hot deployments and failover.

To use docker containers, our components must run on Linux.

#### Git

To isolate the version control system it needs to be distributed. Our only practical choices are Git, DARCS, Mercurial or Fossil. Fossil has some interesting features, Mercurial handles binaries well, ARCS has a formal definition and a relatively simple design but Git has been chosen because of the availability of workflow solutions such as Gitlab. 


