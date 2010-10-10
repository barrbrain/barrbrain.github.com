---
layout: post
title: svn-fe support for svn deltas
---

While I've been quiet the last two months, Jonathan Nieder, Ramkumar Ramachandra and I have been working on support for deltas within svn-fe. These days, active development happens mostly in the git tree. Hopefully, the enhancements made there will become available upstream.

I went on a bug-squashing spree yesterday and managed to get the code to a point where the first 940,166 commits of the ASF repo could be imported without error. The bugs were mostly little things, misreading of the svndiff spec, artificial limitations of the implementation, unimplemented features and so forth.

In the next few days, we will clean up and reroll for submission to the git mailing list.

I also took some time to tutor Ram about performance profiling and wrote a patch to his svnrdump tool to fix a performance bottleneck. It is now primarily limited by how quickly the server can return deltas.

Altogether, the svnrdump, svn-fe, git-fast-import toolchain is looking to be quite effective. The work remaining is incremental support and to integrate the chain within git-remote-svn. I have posted a proof-of-concept for fast branch mapping from the imported commit sequence.

I am really grateful to Ram and Jonathan for their substantial contributions to extending svn-fe to support svn dump format version 3.
