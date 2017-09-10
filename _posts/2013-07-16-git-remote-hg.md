---
layout: post
title: git-remote-hg
location: Sydney
---

Following is a quick brain dump of getting set up with git-remote-hg.

pre.. sudo easy\_install -U mercurial
curl -O https://raw.github.com/git/git/master/contrib/remote-helpers/git-remote-hg
chmod +x git-remote-hg
mv git-remote-hg ~/bin/
git config --global remote-hg.hg-git-compat true
git config --global remote-hg.force-push false

git clone hg::<hg-url>

[git hooks to CYA when using hg-git mode with git-remote-hg](https://gist.github.com/barrbrain/5931547)

.git/hooks/commit-msg

pre.. \#!/bin/sh
test "2" = \`grep -e '^-~~HG-~~$' -e '<sup>branch\ :\ \[</sup> \]\[^ \]\*$' "$1"|wc -l\` || {
echo &gt;&2 Missing hg branch specification.
exit 1
}

.git/hooks/prepare-commit-msg

pre.. \#!/bin/sh
grep -q '^-~~HG-~~$' "$1" || echo '-~~HG-~~
branch : '"\`git symbolic-ref -q --short HEAD\`" &gt;&gt; "$1"
