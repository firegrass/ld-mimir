## What is Provenance?

>Provenance is information about entities, activities, and people involved in producing a piece of data or thing, which can be used to form assessments about its quality, reliability or trustworthiness [@McGuinness:13:PTP].
 
Provenance is particularly important to the semantic web community as they need to track the complicated web of trust between linked data sources. To meet these needs, the W3C published the PROV standard.

The PROV data model supports the following:

* The core concepts of identifying an object, attributing the object to person or entity, and representing processing steps
* Accessing provenance-related information expressed in other standards
* Accessing provenance
* The provenance of provenance
* Reproducibility
* Versioning
* Representing procedures
* Representing derivation

## Provenance extraction from version control

The Git2Prov project [@denies_iswc_2013] demonstrates a model for extracting PROV from a git repository. A altered version of this model is presented here that demonstrates the core concepts.

A git repository can be viewed as a sequence of linked commits. Each commit contains the complete repository state at that point and has a unique hash code along with metadata describing the change and identifying the users involved. A diff can be created for any pair of commits that will show altered, added, renamed and copied files.

Our process to translate git into W3C PROV differs slightly from this work (which has a node implementation) and is described here.

![Git object structure (c=commit d=diff f=changed files)](images/git.png)

To translate from this to the PROV data model we use the following process:

* A start and end commit are selected using their hash or alias

* Commits are topologically sorted 

* Commits are grouped into pairs for differencing from the most current to oldest with the oldest commit compared against the empty commit $\epsilon$. This produces a sequence of commit pairs:

$$ (c_{n},c_{n-1}) \ldots (c_{0},\epsilon) $$

* A diff is taken between each commit in a pair and associated with the first commit in the pair producing:

$$ (c_{n},d(c_{n},c_{n-1})) \ldots (c_{0},d(c_{0},\epsilon))  $$

* Each diff / commit pair is then processed into statements that can be appended to a provenance graph. The commit pairs are then processed into triples as follows:


For the commit:

~~~~ {.ttl}

vcs:commit-{c.SHAHash} a prov:Activity 
  rdfs:label '{c.CommitMessage}' ;
  prov:startedAtTime {c.Author.Time} ;   
  prov:endedAtTime {c.Commit.Time} ;
  prov.wasAssociatedWith vcs:git-user-{c.Commit.User} ;  
  prov.wasInformedBy vcs:commit-{c.Commit.ParentCommit.SHAHash} ;
  prov.qualifiedAssociation 
    [
      a prov:Association ;
      prov:agent vcs:git-user{c.Commit.User} ;
      prov:hadRole "author, comitter" ;
    ]
~~~~

For each changed file in the commit:

~~~~ {.ttl}

vcs:file-{f.SHAHash}-{f.FilePath} a prov:Entity,content:ContentAsText ;
  content:chars {git repository http uri}{f.FilePath}-{f.ShaHash} ;
  prov:specializationOf {git repository http uri}{f.FilePath} ;
  prov:wasAttributedTo vcs:git-user-{f.User} ;
  prov:wasGeneratedBy vcs:commit-{c.SHAHash} ;


vcs:commit-{c.SHAHash} prov:uses cs:file-{f.SHAHash}-{f.FilePath} ;

~~~~


## URI generation

Handily, git SHA hashes are generated to identify every unique object in git - commits, individual file versions etc. Git also has the ability to generate shortened versions of the long encoded hash strings. We can also use base62 encoding to shorten them further if required.

### On short hash length

>Generally, eight to ten characters are more than enough to be unique within a project. One of the largest Git projects, the Linux kernel, is beginning to need 12 characters out of the possible 40 to stay unique.

So, initial hash length selection is important. We can come up with a strategy to deal with collisions in the future and git will tell us when our hash length is no longer unique.

### Dereferencability 

Git content ids (vcs:file) should be dereferencable, either by representing the content as a property of the uri, or through the use of a service that can resolve them to the text they represent (see github raw URLs for reference). Provenance will be used as input to the resource compiler, so it needs to be able to simply access the content that the provenance graph refers to.


### Resource URI generation

The 'prov:specialisationOf' property is a URI that represents the resource at any version, so it is vital that we can compute the same URI with different git histories. So we cannot use a git object hash. We also cannot use an identity generation process (such as guid/uuid tricks) external to git, as this violates our idempotency requirement. So provisionally we will walk the history of the file, find the first commit and take a hash of its path and file name. 





