---
layout: post
title: Posted to git mailing list
---

I posted the following email to the git mailing list to see what people closer to git think about my project concept:

Hi folks,

As my first posting to the list, I'd like to start by giving a big thank you to all the git developers and maintainers for such a great tool.

Unfortunately, I still have to interact with lesser tools such as Subversion and that is what leads me to post.

I'm employed on proprietary project which is supported by a large number of open source tools. The 'canonical' source repository is hosted on a Subversion server on the other side of a rather unreliable WAN link. To date I've been using a combination of git-svn, cron, and a handful of bash scripts to handle marshalling commits between our git repositories and the Subversion instance. However, whilst this solution works well for incremental commits, every time a branch is created on the remote repository it's a hassle to synchronise.
So I thought I'd use git-svn and standard layout - this resulted in blasting my link with so many HTTP requests that I got a stern warning from our sysadmin and I'm sure the firm on the other side of the link weren't impressed.
After exploring a few solutions I used SVK to create a local mirror of the repository.

When I pointed git-svn at the local mirror, it took 4 days, a whole lot of RAM and fell over at 90% completion with a checksum error.

When I pointed svn-all-fast-export at the repository it had to skip three commits or would indefinitely spew garbage.

When I pointed svn2git.py at a dump of the repository it successfully imported 50% of commits and then ran at snail's pace, ETA next century.

I decided that I liked the idea of subversion dump in - git fast-import out but it had to scale well.

So I grabbed the git-fast-import documentation and the Subversion dump format documentation and tried to design a data structure that would map well between them and scale linearly with my repository.

I started a new project to implement my design and am curious as to how many git users actually care about this kind of problem. While conversion is once off for most projects - there are an awful number of projects currently using Subversion. As the community and tool-chain builds around git, that will mean many desiring to make the transition. I hope to make it far less painful than it has been for me.

My project is still in the preview phase but has enough to import commit-tree structure bar symlinks and executable flags. It imports my 22000+ commit 2.8GB dump in 4 minutes. It is currently 840 non-comment lines of C. I aim to produce output that git-svn can take over from.

Is it worthwhile to start a new project - or would it be better to grok the internals of existing projects and try to make them scale?

Best regards,
David M Barr
