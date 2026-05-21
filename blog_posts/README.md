# Blog Posts Guide

## Creating a New Post

Create a new `.md` file in this directory with YAML front matter:

```markdown
---
title: Your Post Title
subtitle: Optional subtitle
date: YYYY-MM-DD
image: static/figures/preview-image.png  # Optional preview image for blog index
tags: AI Safety, LLMs, Ethics  # Optional comma-separated tags
---

Your content here...
```

## Adding Images

Place images in `static/blog/` and reference them in markdown:

```markdown
![Alt text](static/blog/my-image.png)
```

You can also use existing images from `static/figures/` or other static directories.

For custom sizing, use HTML:

```html
<img src="static/blog/my-image.png" alt="Description" width="400">
```

## Adding Downloadable Files

Place files in `static/files/` (or directly in `static/`) and link to them:

```markdown
Download the [paper](static/files/paper.pdf) or [dataset](static/files/data.csv).
```

## Directory Structure

```
static/
  ├── blog/         # Blog post images
  ├── files/        # Downloadable files (PDFs, CSVs, etc.)
  └── figures/      # Research figures (can be used in blog posts too)

blog_posts/
  ├── your-post.md  # Your blog posts
  └── README.md     # This file
```

## Tags

Add tags to your posts for categorization and filtering:

```markdown
---
tags: AI Safety, LLMs, Ethics
---
```

Tags will appear:
- As filter buttons on the blog index page
- Below each post's metadata

## Footnotes

Use standard markdown footnote syntax:

```markdown
This is a sentence with a footnote.[^1]

[^1]: This is the footnote content.
```

Footnotes have interactive behavior:
- **Hover**: Pan over a footnote reference to see a preview tooltip
- **Click**: Click to pin the tooltip (stays visible)
- **Click again**: Click the same reference to unpin
- **Click elsewhere**: Click outside to unpin

## After Creating/Editing Posts

Run `python render_static.py` to regenerate the static site.
