---
layout: post
title: Repository tree library functionally complete
---

Well, its been a lot of work but the repository tree library for svn-dump-fast-export is now complete.
The external interface now allows copy, add, delete, modify, commit and diff.
This is sufficient to replay an svn dump and produce the git-fast-import commands for each changeset.
So now comes the heavy lifting of porting the dump parser from python.
