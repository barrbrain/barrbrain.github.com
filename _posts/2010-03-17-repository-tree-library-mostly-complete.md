---
layout: post
title: Repository tree library mostly complete
---

I've started work on the repository tree representation library for svn-dump-fast-export.
In the wee hours of this morning, I completed the tree mutation methods, I think.
From visual inspection of tree dumps between revisions, the behaviour seems correct.
Now I'll have to go back over the code and clean up so that it is readable.

I haven't yet implemented any garbage collection but only 66MB is used for the test case.
The test run completed in 1.4 seconds, so it seems pretty quick.

The next step from here is to create a tree diffing method since there isn't a one-to-one relationship between git and subversion operations.
