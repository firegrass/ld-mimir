## Developing Owldin (the editor)

We have a docker container for local development of . It means that there's a consistent environment for the server side (useful when we have linux dependencies).

### Installing

Pull the local dev image:

~~~sh
$ docker pull nice/ld-local-dev
~~~

### Running

~~~sh
$ docker kill ld-local-dev && docker rm ld-local-dev
$ docker run -i -t --name ld-local-dev -p 8334:80 --link olddemo:oldemo -v /ABSOLUTE/PATH/TO/MIMIR/REPO/src/owldin:/src/owldin -v /ABSOLUTE/PATH/TO/PROJECT/FILES/TO/EDIT:/tmp nice/ld-local-dev
~~~

A few notes explaining this: 

`docker run -i -t` keeps the docker container visible and interactive so that you can see it working and kill it with ^C. 

`--name ld-local-dev` this makes sure the container has a known name, making it easier to clean up later

`-p 8334:80` this means you can connect to Owldin on port 8334 on the IP of your docker host. 

`--link olddemo:olddemo` this creates a link to the olddemo docker container that you should also be running. Owldin uses this as a service.

`-v /ABSOLUTE/PATH/TO/MIMIR/REPO/src/owldin:/src/owldin` configure this so that it's an absolute link to /src/owldin on your local machine

`-v /ABSOLUTE/PATH/TO/PROJECT/FILES/TO/EDIT:/tmp` configure this so that it points to the folder with the files you wish to work with inside the editor instance

`nice/ld-local-dev` the name of the image to use for the container

### What it does

The container uses your local versions of the Owldin source. It automatically restarts the server side when server side code changes, and automatically rebuilds the client side javascript when that code changes. 

### Caveats

You can install npm modules from your machine and manually trigger a restart/rebuild by touching a file. However, if the dependency builds a binary node binding (difficult to predict in advance.. it will just cause horrible errors afterwards) you would be wise to delete the `node_modules` folder and restart the docker container. This will do an `npm install` and make sure the linux versions, suitable for the docker container to use, are installed.

## Updating these docs

While working on a forked version of Mimir:

  - Delete local and remote versions of the `gh-pages` branch.
  - Ensure the `nhsevidence/ld-mimir` repo is added as a remote, called `upstream` and make sure your local fork is up to date:

~~~sh
$ git fetch
$ get rebase upstream/master
~~~

  - Checkout upstream's gh-pages branch

~~~sh
$ git checkout -b gh-pages upstream/gh-pages
~~~

  - Go back into the master branch
  - Commit any changes to the documentation in /docs
  - with Pandoc and Make installed, run:

~~~sh
$ make publish # Generates the html versions of the docs, commits and pushes the gh-pages branch
~~~

  - Create a pull request from your gh-pages branch to the upstream gh-pages branch.

  

