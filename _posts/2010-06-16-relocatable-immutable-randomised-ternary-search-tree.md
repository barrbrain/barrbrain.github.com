---
layout: post
title: A relocatable, immutable, randomised, ternary search tree
---

I am in the process of simplifying and cleaning up my [svn-dump-fast-export](http://ba.rr-dav.id.au/svn-dump-fast-export) project with a view to getting it merged into git-contrib. One of the current short-comings is the complexity of the commit-tree manipulation component. Upon examining it I have noticed that much of the complexity is in the specialisation of a general data structure. I have decided that the readability and complexity can be greatly improved upon if I extract this data structure into a separate component. The design of this data structure is pivotal to the time and memory costs of the tool and the ease of persistence. I have found very little literature on this particular data structure so I will take this opportunity to describe it and explore its features.

The commit-tree manipulation component requires a structure that provides a map from paths to blobs. This structure also needs to provide a map from a path to all blobs rooted at that path. It also needs an efficient operation to graft such a sub-tree at a particular path. Finally, it needs to be efficiently copied for a small set of modifications to be made.

In early revisions of the project, I had a quickly designed and implemented data structure that essentially a multiway tree. Each node was a reference to a sorted list of links exiting that node. When modifying a node, the entire list was copied and resorted after modifying a single element. Because the number of changes to a given node is limited in this application, the inefficiency was quite tolerable for most real-world data sets.

More recently, I had an epiphany that the sorted lists could be replaced with some kind of copy-on-write binary search tree. I implemented this by adapting a treap implementation I was using for string interning. This was effectively a relocatable, immutable, randomised, binary search tree. This change alone reduced the memory demands of the tool by an order of magnitude.

In the last week or so, I have come to realise that once the indirection via directory references is taken into account, it can be seen that the core data structure in use is a relocatable, immutable, randomised, ternary search tree. In a follow-up post I will discuss its properties and why it is so effective for this application.
