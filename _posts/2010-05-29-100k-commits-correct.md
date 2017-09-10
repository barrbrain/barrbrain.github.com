---
layout: post
title: A hundred thousand commits correct
---

Big news everybody! I've finally completed my alternate implementation of [svn-dump-fast-export](/svn-dump-fast-export/) in Perl. The key step was coming up with a simple algorithm that was of moderate time complexity and easy to prove correctness. I'll come back to that in a minute.

I was able to demonstrate that [the latest commit](http://github.com/barrbrain/svn-dump-fast-export/commit/c373b4b) produced consistent results between the C and Perl implementations for the first hundred thousand commits of the [Apache Software Foundation repository](http://svn.apache.org/repos/asf).
I am presently attempting to verify an import of the first 940,166 commits of the same repository, from a dump dated 02-May-2010 15:14. The Perl implementation has comparable memory footprint to the C implementation but a much larger I/O footprint. As such, it may take as long as a week to complete although the C implementation completed in just two hours.

The algorithm
-------------

My first assertion is that within a revision any path which does not descend from any path in the change log remains unchanged. From this I infer that it is sufficient to update all paths that descend from an entry in the changelog.
To update the tree: iterate over the entries of the changelog, and if it does not exist in the target version then delete it, otherwise if it is a file then update it but if it is a directory then delete first and then add all files that descend from it.
In a large changelog this will result in a lot of repeated work. To avoid repeating operations: sort the changelog before iterating and for each directory updated skip any entries in the changelog that descend from it. You only need to remember the last directory updated because all paths that descend from it will follow it immediately in a sorted changelog. I will soon push a commit with this optimisation.
