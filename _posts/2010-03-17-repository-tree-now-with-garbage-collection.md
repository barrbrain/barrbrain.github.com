---
layout: post
title: Repository tree now with garbage collection
---

I've implemented garbage collection for the repository tree library.
It gives about a third reduction in memory footprint, 67MB to 47MB.
It costs about 20% in runtime performance but we're still talking 1 second for my test data.
This will be heavily outweighed by the blob processing in practise.
So we're looking good for a stupidly fast and memory efficient solution.
