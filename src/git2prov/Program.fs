// Learn more about F# at http://fsharp.net
// See the 'F# Tutorial' project for more help.

module Git =

open LibGit2Sharp

let inline (>>|) x s = printfn s x;()
let inline (>>>) x s = printfn s x;x

type Commit =
  | Commit of LibGit2Sharp.Commit
  | Head
  
let commits (r:LibGit2Sharp.Repository) f = query {
  for c in r.Commits do
  where (f c)
  yield Commit c
}


let diffs (r:LibGit2Sharp.Repository) (cx:Commit seq) = 
  let diff = function
    | Commit.Commit c,Commit.Commit c' -> r.Diff.Compare (c.Tree,c'.Tree)
    | Commit.Head,Commit.Commit c' -> r.Diff.Compare<TreeChanges>(null :> LibGit2Sharp.Tree,c'.Tree)
  Seq.append [Commit.Head] cx
  |> Seq.pairwise
  |> Seq.map diff 



[<EntryPoint>]
let main argv = 
    argv >>| "%A"
    0 // return an integer exit code

