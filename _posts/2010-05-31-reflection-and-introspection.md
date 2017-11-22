---
layout: post
title: Reflection and introspection
---

It has been quite interesting trying to build a website that is minimalist yet
informative and make use of a variety of media. Unfortunately, video is still a
minefield on the web and even when a formal agreement is reached for HTML 5, it
will still be some time before a dominant standard for web video emerges. I hope
that a royalty-free video standard with an open-source reference implementation
is victorious. It would terrible to see the legal wranglings that occurred with
JPEG, GIF and MP3 happen again with video.

I could have saved a lot of time if I'd read the documentation for the
publishing tool I chose before creating my site structure. It is quite useful to
be able to separate content from structure, so I consider it a worthwhile cost.

Once I managed to get my head around using YAML front matter to add structured
metadata, I was quite pleased with Jekyll as a publishing tool. There is still
some boilerplate that can be factored out though.

I've added a print styleheet. My personal preference is for dense but
well-flowing text in print. Your mileage may vary. I've also cleaned up the atom
feed so that it should be correct when served up on liskov. However, Safari
doesn't seem to like it when served via virtual.anu.edu.au. All of the HTML and
CSS pass validation except the video posting. This is because the applet tag has
been obsoleted in HTML 5 and the video tag requires server support to implement
correctly. See for example,
[CSS validation for my storyboard post](http://jigsaw.w3.org/css-validator/validator?uri=http%3A%2F%2Fba.rr-dav.id.au%2F2010%2F05%2F03%2Fstory-board.html)
and
[HTML 5 validation for my storyboard post](http://validator.w3.org/check?uri=http%3A%2F%2Fba.rr-dav.id.au%2F2010%2F05%2F03%2Fstory-board.html&charset=%28detect+automatically%29&doctype=Inline&group=0).
The atom feed is also valid but has some compatability issues as described in
[the validation results for my atom feed](http://validator.w3.org/feed/check.cgi?url=http%3A%2F%2Fba.rr-dav.id.au%2F).

Overall, I've been disappointed that I haven't had the time to create a cohesive
set of documentation. For now the website is just a collection of random rants.
I'll continue to work on it after I complete the New Media course.

I accept that my current choice of colours is not optimal and interferes with
identifying links.

I decided against altering standard icons just to meet the requirements of the
source log aspect of the assignment. I chose rather to ensure that all content
on the site is original compositions by myself. The downside of these choices is
that my skills in graphic expression are quite limited.

I close with a random thought that popped into my head the other day:

Grammar geek: So how are the home renovations going?

Grammar agnostic: It's not quiet there yet.

Grammar geek: Don't you mean 'quite'?

Grammar agnostic: No.

Grammar geek: Oh, right.
