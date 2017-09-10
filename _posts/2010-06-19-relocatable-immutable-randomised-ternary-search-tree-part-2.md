---
layout: post
title: A relocatable, immutable, randomised, ternary search tree (part 2)
---

Following on from my last post, I have determined the requirements for the data structure. The structure must provide a map from (revision, path) pairs to file-system nodes, i.e. files and directories. Four basic operations are required: insert, remove, replace, graft, diff. What is graft? It takes all entries in the map descendent from a common prefix and copies them to new keys with the common prefix replaced by a new prefix. Diff compares the keys below two given prefixes and computes a sequence of add, remove and replace operations to produce one from the other.

Add, remove and replace operations can be represented by a single operation, delta(a, b): delta(nil, b) = add(b), delta(a, nil) = remove(a), delta(a, b) where a and b not nil = replace(a, b).

I believe that storing the keys in a trie, of which there are many implementations, will require memory bounded by a constant multiple of the entropy of the key set. From Bentley's paper it appears that a ternary search tree is a fast and efficient trie representation. I propose that when coupled with an immutable tree operations that the memory required for each change set will also be bounded by a constant multiple of the entropy of its key set.

Related reading
---------------

[Purely functional data structures](http://www.cs.cmu.edu/~rwh/theses/okasaki.pdf) by Chris Okasaki, Cambridge University Press, 1998, ISBN 0-521-66350-4.

[Ternary Search Trees](http://www.drdobbs.com/windows/184410528)
By Jon Bentley and Bob Sedgewick, April 01, 1998

[Fast algorithms for sorting and searching strings](http://www.cs.princeton.edu/~rs/strings/paper.pdf)

pre. @inproceedings{314321,
author = "Bentley, Jon L. and Sedgewick, Robert",
title = "Fast algorithms for sorting and searching strings",
year = "1997",
address = "Philadelphia, PA, USA",
booktitle = "SODA '97: Proceedings of the eighth annual ACM-SIAM symposium on Discrete algorithms",
isbn = "0-89871-390-0",
location = "New Orleans, Louisiana, United States",
pages = "360--369",
publisher = "Society for Industrial and Applied Mathematics",
}

Raimund G. Seidel and Cecilia R. Aragon, Randomized Search Trees, Algorithmica, 16(4/5):464-497 (1996).
Also in 30th Annual Symposium on Foundations of Computer Science, pages 540-545, Research Triangle Park, North Carolina, 30 October-1 November 1989. IEEE.

Conrado Martinez and Salvador Roura, Randomized Binary Search Trees, Journal of the ACM, 45(2):288-323, March 1998.
