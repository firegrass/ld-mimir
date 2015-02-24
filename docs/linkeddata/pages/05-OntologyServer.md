## Ontology management

[TBox](http://en.wikipedia.org/wiki/Tbox) Ontology statements relating to NICE domains and compilation concerns need to be version controlled and authored as well as the ABox statements generated from content. There are a variety of editors and toolkits appropriate for this, so we will not attempt to build anything. Version control, verification and translation are concerns we need to address.

So applying the plain text principle, we should choose a representation suitable for use with GIT. The [Manchester OWL syntax](http://www.w3.org/TR/owl2-manchester-syntax/) is an elegant notation that is supported by the tools we are likely to use.

We will use standard version control practices to maintain the ontologies in the /ns folder of the NICE ontology [github](https://github.com/nhsevidence/ontologies/tree/master/ns) repository.

On commit, the input .omn ontologies will be passed into a simple pipeline:

* Translate .omn to .ttl
* Translate .ttl to html documentation

Store these pre translated resources in a docker container, along with a simple http service that content negotiates ontology urls:

* http://ontologies.nice.org.uk/ns/ontologyname With a standard browser accept header -> returns content of ns/ontologyname.html
* http://ontologies.nice.org.uk/ns/ontologyname Asking for text/ttl -> returns content of ns/ontologyname.ttl
* http://ontologies.nice.org.uk/ns/ontologyname Asking for text/owl-manchester -> returns content of/ontologyname.omn

[MOWL](mowl-power.cs.man.ac.uk:8080/converter/) support translation as a service, but we should no rely on an external dependency with no SLA. So our own translation tools are required.
