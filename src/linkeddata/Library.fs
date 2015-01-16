
module Git

open LibGit2Sharp


type Commit =
  | Commit of LibGit2Sharp.Commit
  | Head
  
let commits (r:LibGit2Sharp.Repository) f = query {
  for c in r.Commits do
  where (f c)
  yield c
}

let diffs (r:LibGit2Sharp.Repository) cx = query {
   

}

