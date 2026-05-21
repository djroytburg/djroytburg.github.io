---
draft: true
title: Example Post with Media
subtitle: Demonstrating images and file links
date: 2026-02-03
---

This is an example showing how to include images and files in blog posts.

## Adding Images

You can include images using standard markdown syntax:

![Alt text for accessibility](static/blog/my-image.png)

You can also use existing images from your static directory:

![Mind the gap figure](static/figures/mind-gap.png)

## Adding Files

Link to downloadable files like PDFs or datasets:

Download the [research paper](static/files/paper.pdf) or view the [dataset](static/files/data.csv).

## Image Sizing

If you need custom sizing, you can use HTML directly in markdown:

<img src="static/blog/my-image.png" alt="Custom sized image" width="400">

## Code with Images

You can combine code blocks with images to show results:

```python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3, 4])
plt.savefig('output.png')
```

Here's the output:

![Plot output](static/blog/output.png)
