---
layout: post
title: Tagged first point-release for svn-dump-fast-export
---

I've been scratching my head the past few days, wondering why only the first few thousand commits outputted had any content.
I eventually narrowed it down to the fact that 70 or so commits were being silently skipped, and furthermore that was caused by a simple but nasty buffering bug.
As soon as I fixed said bug, I was able to convert the complete history of my test repository. It imported a 2.8GB subversion dump in just 5 minutes. After repacking, the output weighed in at 377MB.
That commit has been tagged as 0.1 - the first release to produce a marginally useful result. I will now focus on cleaning up the code and then implement the last few metadata conversions (executable, symlink).
That's all going to have to wait a little because I need to hammer out an essay on computer ethics.
