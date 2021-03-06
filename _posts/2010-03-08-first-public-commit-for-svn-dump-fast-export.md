---
layout: post
title: First public commit for svn-dump-fast-export
---

I, David Michael Barr, have finally got around to contributing back to the open source community.

My motivation is that I have an 800MB Subversion repository with about 23,000 commits and a non-standard structure. All the well-known git-svn import tools at this date either fail at 95% completion after days of computation, go crazy duplicating content on 3 commits or use an inordinate amount of memory, grinding near to a halt at 50% completion.
The last of those descriptions applies to git2svn.py, the simplicity of which is stunning.
My aim is to implement the function of git2svn.py but with more stable time and memory requirements.
To do this, I will need to use some clever data structures much like those used within git-core.
To that end, I have just published my fork of Jason Evans' hash-based treap implementation on GitHub. It has a two-clause BSD-style license.
It is the first file to be added to [my svn-dump-fast-export repository](http://github.com/barrbrain/svn-dump-fast-export/).
It is quite succinct at only 260 lines of C, about 30% slower on tree intensive benchmarks but about 3% faster for infrequent operations.
It's not particularly useful on its own so I will hopefully soon be able to publish my C-string interning library which depends on it.

More to come on the topic of svn-dump-fast-export.
