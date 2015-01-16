// Learn more about F# at http://fsharp.net
// See the 'F# Tutorial' project for more help.

module Git =

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



[<EntryPoint>]
let main argv = 
    printfn "%A" argv
    0 // return an integer exit code

