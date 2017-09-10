---
layout: post
title: git-remote-hg
location: Sydney
---

Following is a quick brain dump of getting set up with git-remote-hg.

<pre>
sudo easy_install -U mercurial
curl -O https://raw.github.com/git/git/master/contrib/remote-helpers/git-remote-hg
chmod +x git-remote-hg
mv git-remote-hg ~/bin/
git config --global remote-hg.hg-git-compat true
git config --global remote-hg.force-push false
git clone hg::&lt;hg-url&gt;
</pre>

[git hooks to CYA when using hg-git mode with git-remote-hg](https://gist.github.com/barrbrain/5931547)
