git ls-remote --get-url $URL
/Users/barrbrain/Library/Caches/git/github.com/barrbrain/barrbrain.github.com.git

EDITOR=echo git config --system -e
/Users/barrbrain/.homebrew/Cellar/git/1.8.2.1/etc/gitconfig

git config --system -l
url./Users/barrbrain/Library/Caches/git.insteadof=https:/
url./Users/barrbrain/Library/Caches/git.insteadof=http:/
url.https://.pushinsteadof=https://
url.http://.pushinsteadof=http://
url./Users/barrbrain/Library/Caches/git/github.com/.insteadof=git@github.com:

alias sync='{ find ~/Library/Caches/git -type d -name '\''*.git'\'' -exec echo git --git-dir={} remote update '\''&'\'' '\'';'\'' -prune; echo wait; } | GIT_CONFIG_NOSYSTEM=true bash -s'


