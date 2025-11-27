#!/usr/bin/env python3
"""Render the Jinja templates to static HTML in a `docs/` folder and copy `static/`.

Usage: python render_static.py

This creates `docs/index.html`, `docs/research.html`, `docs/publications.html`,
`docs/cv.html`, `docs/blog.html` and copies the `static/` folder to `docs/static/`.
Then you can publish the `docs/` folder with GitHub Pages (branch: master, folder: docs).
"""

import os
import shutil
from jinja2 import Environment, FileSystemLoader

ROOT = os.path.dirname(__file__)
TEMPLATES = os.path.join(ROOT, 'templates')
STATIC = os.path.join(ROOT, 'static')
OUT = os.path.join(ROOT, 'docs')

PAGES = {
    'research': {
        'title': 'Research',
        'body': 'Describe your research interests and link to a fuller research page.'
    },
    'publications': {
        'title': 'Publications',
        'body': 'A list of publications will go here. Link to PDFs or external pages as desired.'
    },
    'cv': {
        'title': 'Curriculum Vitae',
        'body': 'Link to your CV (PDF) or provide a short biography and a download link.'
    },
    'blog': {
        'title': 'Blog',
        'body': 'Your personal blog index can be linked or embedded here.'
    }
}


def ensure_out():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)


def copy_static():
    dest = os.path.join(OUT, 'static')
    shutil.copytree(STATIC, dest)


def make_env():
    env = Environment(loader=FileSystemLoader(TEMPLATES))

    # provide a simple url_for replacement for static export
    def url_for(endpoint, filename=None):
        if endpoint == 'static':
            return f'static/{filename}'
        routes = {
            'index': 'index.html',
            'research': 'research.html',
            'publications': 'publications.html',
            'cv': 'cv.html',
            'blog': 'blog.html'
        }
        return routes.get(endpoint, '#')

    env.globals['url_for'] = url_for
    return env


def render_templates():
    env = make_env()
    # render index.html directly
    index_t = env.get_template('index.html')
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_t.render())

    # render the generic pages
    page_t = env.get_template('page.html')
    for slug, ctx in PAGES.items():
        html = page_t.render(title=ctx['title'], body=ctx['body'])
        out_path = os.path.join(OUT, f"{slug}.html")
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)


def main():
    ensure_out()
    copy_static()
    render_templates()
    print('Static site rendered to', OUT)


if __name__ == '__main__':
    main()
