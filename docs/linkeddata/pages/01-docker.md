
## Running a Mimir Instance


To use Mimir you need to run and link the old linked data demo - this is used as a source of linked data.

To begin, pull the olddemo image.

~~~sh
$ docker pull nice/olddemo
~~~

Now we need to run it and give it a name. This name is important, so please use 'olddemo'

~~~sh 
$ docker run --name olddemo nice/olddemo
~~~

Next we pull the Mimir image

~~~sh
$ docker pull nice/mimir
~~~

Now we need to run mimir. To do this we need to map a directory, forward a port and link to the 'olddata' image.

~~~sh
$ docker run --link olddemo:olddemo -v ~/my-project-files:/tmp -p 3424:80 --name mimir nice/mimir
~~~

This command:

  - forwards port 80 of the docker container to port 3424. 
  - maps the local folder ~/my-project-files to /tmp in the container. This is the folder mimir will use.
  - creates a link to olddemo. This generates a bunch of environment variables used by mimir.


To connect to the Mimir instance, you need the docker host ip address. On Mac OS X, this is:

~~~sh
$boot2docker ip
~~~

You can then navigate to (in this example's case) http://${DOCKER_HOST}:3424 and you're done.

## Running the old Linked Data Demo Standalone

Assuming you have a docker host (boot2docker for example), the process for installing the container:

~~~sh
$ docker pull nice/olddemo
~~~

And then running:

~~~sh
$ docker run nice/olddemo
~~~

To find the IP address (the ${DOCKER_HOST}) run:

~~~sh
$ boot2docker ip
~~~

Then you can navigate to http://${DOCKER_HOST}/index.html

That's it!



