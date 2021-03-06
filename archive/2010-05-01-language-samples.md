---
layout: gallery
title: Language samples
photos: - id: c
          title: C source with syntax highlighting
          file: lang/c.png
          comment: This is my prefered language for simple tasks done fast.
        - id: bash
          title: bash source with syntax highlighting
          file: lang/bash.png
          comment: For quickly assembling a console tool from other smaller
                   tools, bash is great.
        - id: perl
          title: perl source with syntax highlighting
          file: lang/perl.png
          comment: When the "fork rate of bash":#bash gets out of control,
                   its time to port to perl.
---

The primary purpose of this gallery is to test my new template. The data for the gallery is specified in the [YAML Front Matter](http://wiki.github.com/mojombo/jekyll/yaml-front-matter), while the gallery description follows in the content of the post. You can even link to photos from the summary, e.g. [my perl screenshot](#perl).

The front matter for this post is as follows:

pre.. ---
layout: gallery
title: Language samples
photos: - id: c
title: C source with syntax highlighting
file: lang/c.png
comment: This is my prefered language for simple tasks done fast.
- id: bash
title: bash source with syntax highlighting
file: lang/bash.png
comment: For quickly assembling a console tool from other smaller
tools, bash is great.
- id: perl
title: perl source with syntax highlighting
file: lang/perl.png
comment: When the [fork rate of bash](#bash) gets out of control,
its time to port to perl.
---

As you can see, it is quite readable but also machine parsable.
