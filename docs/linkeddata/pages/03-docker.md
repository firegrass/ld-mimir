
## Docker containers

### The Old Demo

Mímir currently uses the old Linked Data demonstrator as a source of data. 

This should happen automatically but for legacy purposes, this is how to run the old demo:

Get the olddemo Docker container:

~~~sh
$ docker pull nice/olddemo
~~~

Next you'll need to find the IP address for the docker host (if you want to connect and view it directly)

~~~sh
$ boot2docker ip
~~~

Finally, to run it:

~~~sh
$ docker run -p 3210:80 nice/olddemo
~~~

To view it, navigate to http://$DOCKERHOSTIP$:3210/index.html

That's it!

