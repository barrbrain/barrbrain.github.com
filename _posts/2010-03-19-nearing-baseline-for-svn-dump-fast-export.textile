---
layout: post
title: Nearing baseline for svn-dump-fast-export
---

I've been rapidly coding away again and now svn-dump-fast-export is close to baseline.
I finished porting a basic frontend that reads the tree data but skips props.
The subversion add, delete, and change actions have been mapped to my repository tree library.
My favourite repository for testing now imports in 4 minutes, producing a 750MB pack.
However, git-fast-import seems to be quietly failing on bad path names.
The only symptom is empty trees for most commits.

So, I'm getting very close to my base target of functionality but have a few important bugs to hunt down.
