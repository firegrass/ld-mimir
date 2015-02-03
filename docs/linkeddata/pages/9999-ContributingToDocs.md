
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

  

