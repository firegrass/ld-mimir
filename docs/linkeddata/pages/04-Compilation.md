## Knowledgebase compilation

To compile incrementally compile the knowledge base we need to:

* Determine what source files have changed since the last compilation
* Snapshot those changes so that further changes do not affect the compilation results
* Run a configurable set of transformations from plaintext to triples on each source file
* Aggregate the newly compiled triples into a graph for insertion
* Determine a sparql delete for the previous version of the compiled resources
* Store these triples as a build output

Provenance derived from git history can be used as input to a compiler, as it can be a complete description of the content changed between 2 points in time.

We extend W3C prov a little to support a compilation entity.

~~~~ {.omn}

DataProperty: path
    Domain: Target
    Range: string

Class: Compilation
    SubClassOf: prov:Activity

Class: Target
    SubClassOf: prov:Entity

~~~~

This lets us supply paths for each changed file, as well as its content.


