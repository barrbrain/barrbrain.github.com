---
layout: post
title: Git on Windows
location: Sydney
---

Here are a few useful performance tweaks for git on Windows:

Enable parallel index preload for operations like git diff. This can speed up operations like git diff and git status especially on filesystems like NFS that have weak caching semantics and thus relatively high IO latencies. With this set to true, git will do the index comparison to the filesystem data in parallel, allowing overlapping IO’s.

<pre>
git config --global core.preloadindex true
</pre>

[Disable UAC Virtualisation](http://wiki.inisec.com/index.php/Disable_UAC_Virtualization)

Disable on-access virus scanning for your source directories.
