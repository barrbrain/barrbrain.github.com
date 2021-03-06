---
layout: post
title: Tagged fifth point-release for svn-dump-fast-export
---

Since my last post I've been busily debugging and making small but important changes. Firstly, I implemented a bunch of safety enchancements to reduce the snow ball effect of allocation bugs. Secondly, I created a script to automatically verify the output of the application. This made it much easier to identify bugs - I found three in the dump parser.
The verification of the fifth point release is still running since it errs towards correctness over speed - full checkout and byte-wise comparison of every revision. As at this post, it has verified the 2700 revisions in my testing repository.
Symlinks and executable flags are still missing from this release. For now, I'd rather be sure that blob handling is 100% correct. The next few point releases will probably be for each of these features, some code simplification in the repository tree implementation and better memory management in the svn dump parser.
