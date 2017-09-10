---
layout: post
title: String pool library now available
---

I have added a rather simple library to assign incremental integer identifiers to unique strings to svn-dump-fast-export. My thought is that I will use it to produce a compact representation of the history of the subversion tree during dump conversion. Strings in the data structure can be replaced with an integer field and marshalled between representations by the new library.

The next step for this project will be to define the components of the tree structure.
