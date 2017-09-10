---
layout: post
title: svndump frontend in progress
---

I take back what I said about porting python. I found a BSD licensed subversion dump parser called svndump. Although written in Java, it was straightforward to translate.
The bulk of the work on the frontend is done. Once I sort out a few issues with string allocation and connect svndump to repo\_tree, the pipeline should be complete. There may be room for one more component dedicated to the preamble and postamble for git-fast-import.
