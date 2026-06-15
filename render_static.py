#!/usr/bin/env python3
"""Render the Jinja templates to static HTML in a `docs/` folder and copy `static/`.

Usage: python render_static.py

This creates `docs/index.html`, `docs/research.html`, `docs/publications.html`,
`docs/cv.html`, `docs/blog.html` and copies the `static/` folder to `docs/static/`.
Then you can publish the `docs/` folder with GitHub Pages (branch: master, folder: docs).
"""

import os
import re
import json
import shutil
import subprocess
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False
    print("Warning: markdown library not installed. Run: pip install markdown")

ROOT = os.path.dirname(__file__) or '.'
TEMPLATES = os.path.join(ROOT, 'templates')
STATIC = os.path.join(ROOT, 'static')
OUT = os.path.join(ROOT, 'docs')
PDFS = os.path.join(ROOT, 'pdfs')
CV_DIR = os.path.join(ROOT, 'cv')
BLOG_POSTS = os.path.join(ROOT, 'blog_posts')

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

# ─────────────────────────────────────────────────────────────────────────────
# CV HTML generation from cv.json and roytburg.bib
# ─────────────────────────────────────────────────────────────────────────────

def parse_bib_file(bib_path):
    """Parse a .bib file and return a dict of key -> entry data."""
    entries = {}
    with open(bib_path, 'r') as f:
        content = f.read()
    
    pattern = r'@(\w+)\{([^,]+),([^@]*)'
    for match in re.finditer(pattern, content, re.DOTALL):
        entry_type = match.group(1).lower()
        key = match.group(2).strip()
        fields_str = match.group(3)
        
        fields = {'_type': entry_type}
        field_pattern = r'(\w+)\s*=\s*\{([^}]*)\}'
        for field_match in re.finditer(field_pattern, fields_str):
            field_name = field_match.group(1).lower()
            field_value = field_match.group(2).strip()
            field_value = field_value.replace('\\#', '#').replace('\n', ' ').strip()
            fields[field_name] = field_value
        
        entries[key] = fields
    return entries


def format_authors(author_str, highlight_name=None, equal_contribution=None):
    """Format author string, optionally highlighting a name and marking equal contributors."""
    authors = [a.strip() for a in author_str.split(' and ')]
    formatted = []
    for i, author in enumerate(authors):
        if ',' in author:
            parts = author.split(',')
            name = f"{parts[1].strip()} {parts[0].strip()}"
        else:
            name = author
        
        if highlight_name and (highlight_name.lower() in name.lower() or 
                               any(p.lower() in name.lower() for p in highlight_name.split())):
            name = f'<span class="highlight">{name}</span>'
        
        # Add star for equal contribution
        if equal_contribution and i in equal_contribution:
            name = f'{name}<span class="equal-contrib">*</span>'
        
        formatted.append(name)
    
    if len(formatted) == 1:
        return formatted[0]
    elif len(formatted) == 2:
        return f"{formatted[0]} and {formatted[1]}"
    else:
        return ", ".join(formatted[:-1]) + f", and {formatted[-1]}"


def format_publication(entry, highlight_name=None):
    """Format a single publication entry as HTML."""
    authors = format_authors(entry.get('author', ''), highlight_name)
    title = entry.get('title', '')
    year = entry.get('year', '')
    url = entry.get('url', '')
    
    entry_type = entry.get('_type', '')
    
    if entry_type == 'inproceedings':
        venue = entry.get('booktitle', '')
        if entry.get('volume'):
            venue += f", vol. {entry['volume']}"
        if entry.get('pages'):
            venue += f", pp. {entry['pages']}"
    elif entry_type == 'article':
        venue = entry.get('journal', '')
        if entry.get('volume'):
            venue += f", vol. {entry['volume']}"
    elif entry_type == 'mastersthesis':
        thesis_type = entry.get('type', "Master's Thesis")
        venue = f"{thesis_type}, {entry.get('school', '')}"
    else:
        venue = entry.get('journal', '') or entry.get('booktitle', '')
    
    if url:
        title_html = f'<a href="{url}" target="_blank">{title}</a>'
    else:
        title_html = title
    
    return f'<p class="pub-entry">{authors}. <strong>{title_html}</strong>. <em>{venue}</em>, {year}.</p>'


def generate_cv_html(cv_data, bib_entries, publications_data):
    """Generate the full CV HTML content."""
    name = f"{cv_data['given-name']} {cv_data['sur-name']}"
    html_parts = []
    
    # Summary
    if 'summary' in cv_data:
        html_parts.append(f'''
      <section class="cv-section">
        <h2>Summary</h2>
        <p>{cv_data["summary"]}</p>
      </section>''')
    
    # Education
    if 'degrees' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Education</h2>''')
        for deg in cv_data['degrees']:
            html_parts.append(f'''
        <div class="cv-entry">
          <div class="cv-entry-header">
            <span class="cv-degree">{deg["degree"]}, {deg["discipline"]}</span>
            <span class="cv-year">{deg["year"]}</span>
          </div>
          <div class="cv-school">{deg["school"]}</div>
        </div>''')
        html_parts.append('      </section>')
    
    # Experience/Positions
    if 'employment' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Experience</h2>''')
        for job in cv_data['employment']:
            start = f"{job['start-month']} {job['start-year']}"
            if 'end-year' in job:
                end = f"{job['end-month']} {job['end-year']}"
            else:
                end = "Present"
            html_parts.append(f'''
        <div class="cv-entry">
          <div class="cv-entry-header">
            <span class="cv-title">{job["title"]}</span>
            <span class="cv-dates">{start} – {end}</span>
          </div>
          <div class="cv-org">{job["affiliation"]}, {job["location"]}</div>
          <p class="cv-description">{job["description"]}</p>
        </div>''')
        html_parts.append('      </section>')
    
    # Publications - use the same data as publications page
    if 'bibliography' in cv_data and publications_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Publications</h2>''')
        
        bib = cv_data['bibliography']
        
        # Create a lookup dict for publications by key
        pubs_by_key = {pub['key']: pub for pub in publications_data}
        
        if 'conference-papers' in bib and bib['conference-papers']:
            html_parts.append('        <h3>Conference Papers</h3>')
            for key in bib['conference-papers']:
                if key in pubs_by_key:
                    pub = pubs_by_key[key]
                    html_parts.append(f'        <p class="pub-entry">{pub["authors"]}. <strong>{pub["title"]}</strong>. <em>{pub["venue"]}</em>, {pub["year"]}.</p>')
        
        if 'journal-articles' in bib and bib['journal-articles']:
            html_parts.append('        <h3>Journal Articles</h3>')
            for key in bib['journal-articles']:
                if key in pubs_by_key:
                    pub = pubs_by_key[key]
                    html_parts.append(f'        <p class="pub-entry">{pub["authors"]}. <strong>{pub["title"]}</strong>. <em>{pub["venue"]}</em>, {pub["year"]}.</p>')
        
        if 'theses' in bib and bib['theses']:
            html_parts.append('        <h3>Theses</h3>')
            for key in bib['theses']:
                if key in pubs_by_key:
                    pub = pubs_by_key[key]
                    html_parts.append(f'        <p class="pub-entry">{pub["authors"]}. <strong>{pub["title"]}</strong>. <em>{pub["venue"]}</em>, {pub["year"]}.</p>')
        
        html_parts.append('      </section>')
    
    # Awards
    if 'awards' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Awards & Recognition</h2>
        <ul class="cv-list">''')
        for award in cv_data['awards']:
            if 'year' in award:
                year_str = str(award['year'])
            elif 'years' in award:
                years = award['years']
                year_str = ', '.join(str(y) for y in years)
            else:
                year_str = ''
            html_parts.append(f'          <li>{award["title"]}, {year_str}</li>')
        html_parts.append('        </ul>\n      </section>')
    
    # Skills
    if 'skills' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Skills</h2>
        <p class="cv-skills">''' + ' · '.join(cv_data['skills']) + '</p>\n      </section>')
    
    return '\n'.join(html_parts)


def load_cv_content():
    """Load cv.json and bib, generate HTML for CV page."""
    cv_json_path = os.path.join(ROOT, 'cv', 'cv.json')
    bib_path = os.path.join(ROOT, 'roytburg.bib')
    
    if not os.path.exists(cv_json_path) or not os.path.exists(bib_path):
        return '<p>CV data not found.</p>'
    
    with open(cv_json_path, 'r') as f:
        cv_data = json.load(f)
    
    bib_entries = parse_bib_file(bib_path)
    
    # Load publications with metadata (same as publications page)
    publications_data, _ = load_publications()
    
    return generate_cv_html(cv_data, bib_entries, publications_data)


# ─────────────────────────────────────────────────────────────────────────────
# CV PDF Build
# ─────────────────────────────────────────────────────────────────────────────

def build_cv_pdf():
    """Build the CV PDF from cv.json using the Makefile in cv/."""
    print("Building CV PDF from cv.json and roytburg.bib...")
    
    # Check if cv/ directory exists with required files
    cv_json = os.path.join(CV_DIR, 'cv.json')
    make_tex = os.path.join(CV_DIR, 'make-tex.py')
    makefile = os.path.join(CV_DIR, 'Makefile')
    
    if not all(os.path.exists(f) for f in [cv_json, make_tex, makefile]):
        print("  Warning: CV source files not found, skipping PDF build")
        return False
    
    # Ensure pdfs/ directory exists
    os.makedirs(PDFS, exist_ok=True)
    
    try:
        # Run make in the cv/ directory
        result = subprocess.run(
            ['make'],
            cwd=CV_DIR,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"  Warning: CV PDF build failed:")
            print(f"  stdout: {result.stdout}")
            print(f"  stderr: {result.stderr}")
            return False
        
        # Verify the PDF was created
        pdf_path = os.path.join(PDFS, 'cv.pdf')
        if os.path.exists(pdf_path):
            print(f"  CV PDF built successfully: {pdf_path}")
            return True
        else:
            print("  Warning: CV PDF was not created")
            return False
            
    except FileNotFoundError:
        print("  Warning: 'make' command not found, skipping PDF build")
        return False
    except Exception as e:
        print(f"  Warning: CV build error: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Publications with metadata
# ─────────────────────────────────────────────────────────────────────────────

def load_publications():
    """Load publications from bib file and merge with metadata."""
    bib_path = os.path.join(ROOT, 'roytburg.bib')
    meta_path = os.path.join(ROOT, 'publications_meta.json')
    
    if not os.path.exists(bib_path):
        return [], False
    
    bib_entries = parse_bib_file(bib_path)
    
    # Load metadata if available
    metadata = {}
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            metadata = json.load(f)
    
    publications = []
    has_equal_contrib = False
    
    for key, entry in bib_entries.items():
        meta = metadata.get(key, {})
        equal_contrib = meta.get('equal_contribution')
        
        if equal_contrib:
            has_equal_contrib = True
        
        # Format authors with highlighting and equal contribution markers
        authors = format_authors(entry.get('author', ''), 'Roytburg', equal_contrib)
        
        # Determine venue based on entry type
        entry_type = entry.get('_type', '')
        if entry_type == 'inproceedings':
            venue = entry.get('booktitle', '')
        elif entry_type == 'article':
            venue = entry.get('journal', '')
        elif entry_type == 'mastersthesis':
            thesis_type = entry.get('type', "Master's Thesis")
            venue = f"{thesis_type}, {entry.get('school', '')}"
        else:
            venue = entry.get('journal', '') or entry.get('booktitle', '')
        
        pub = {
            'key': key,
            'title': entry.get('title', ''),
            'authors': authors,
            'venue': venue,
            'year': entry.get('year', ''),
            'type': entry_type,
            # From metadata
            'abstract': meta.get('abstract', ''),
            'paper_url': meta.get('paper_url') or entry.get('url', ''),
            'slides_url': meta.get('slides_url'),
            'code_url': meta.get('code_url'),
            'figure': meta.get('figure'),
            'also_at': meta.get('also_at', []),
        }
        publications.append(pub)
    
    # Sort by year descending
    publications.sort(key=lambda x: x['year'], reverse=True)
    return publications, has_equal_contrib


# ─────────────────────────────────────────────────────────────────────────────
# Blog posts from markdown
# ─────────────────────────────────────────────────────────────────────────────

def parse_blog_post_metadata(content):
    """Parse YAML-style front matter from markdown content."""
    metadata = {}
    
    # Check for front matter (--- at start)
    if not content.startswith('---'):
        return metadata, content
    
    # Find end of front matter
    lines = content.split('\n')
    end_idx = None
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == '---':
            end_idx = i
            break
    
    if end_idx is None:
        return metadata, content
    
    # Parse front matter
    front_matter = '\n'.join(lines[1:end_idx])
    for line in front_matter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            metadata[key.strip()] = value.strip()
    
    # Return metadata and content without front matter
    body = '\n'.join(lines[end_idx + 1:])
    return metadata, body


def load_blog_posts():
    """Load all blog posts from the blog_posts directory."""
    if not MARKDOWN_AVAILABLE or not os.path.exists(BLOG_POSTS):
        return [], set()
    
    posts = []
    all_tags = set()
    
    for filename in os.listdir(BLOG_POSTS):
        if not filename.endswith('.md') or filename == 'README.md':
            continue
        
        filepath = os.path.join(BLOG_POSTS, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        metadata, body = parse_blog_post_metadata(content)
        
        # Convert markdown to HTML with footnotes + heading anchors support.
        # 'toc' assigns stable id attributes to headings so the TOC/rail can link.
        html_content = markdown.markdown(
            body,
            extensions=['fenced_code', 'codehilite', 'footnotes', 'toc']
        )
        
        # Create slug from filename
        slug = os.path.splitext(filename)[0]
        
        # Parse date
        date_str = metadata.get('date', '')
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
        except:
            formatted_date = date_str
        
        # Parse tags (comma-separated)
        tags_str = metadata.get('tags', '')
        tags = [t.strip() for t in tags_str.split(',') if t.strip()]
        all_tags.update(tags)
        
        # Drafts are excluded by default. Set RENDER_DRAFTS=1 to preview them
        # locally (CI never sets it, so docs/ stays clean in production).
        if metadata.get('draft', '').lower() == 'true' and not os.environ.get('RENDER_DRAFTS'):
            continue

        post = {
            'slug': slug,
            'title': metadata.get('title', 'Untitled'),
            'subtitle': metadata.get('subtitle', ''),
            'date': date_str,
            'formatted_date': formatted_date,
            'image': metadata.get('image', ''),
            'content': html_content,
            'tags': tags,
        }

        posts.append(post)
    
    # Sort by date descending
    posts.sort(key=lambda x: x['date'], reverse=True)
    return posts, sorted(all_tags)


# ─────────────────────────────────────────────────────────────────────────────


def ensure_out():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)


def copy_static():
    dest = os.path.join(OUT, 'static')
    shutil.copytree(STATIC, dest)


def copy_pdfs():
    """Copy pdfs/ folder to docs/pdfs/ for downloadable files."""
    if os.path.exists(PDFS):
        dest = os.path.join(OUT, 'pdfs')
        shutil.copytree(PDFS, dest)
        print(f'Copied pdfs/ to {dest}')


def get_last_commit_date():
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%cd', '--date=format:%B %d, %Y'],
            cwd=ROOT, capture_output=True, text=True
        )
        return result.stdout.strip() or datetime.now().strftime('%B %d, %Y')
    except Exception:
        return datetime.now().strftime('%B %d, %Y')


def make_env():
    env = Environment(loader=FileSystemLoader(TEMPLATES))

    # provide a simple url_for replacement for static export
    def url_for(endpoint, filename=None):
        if endpoint == 'static':
            return f'static/{filename}'
        if endpoint == 'pdfs':
            return f'pdfs/{filename}'
        routes = {
            'index': 'index.html',
            'research': 'research.html',
            'publications': 'publications.html',
            'cv': 'cv.html',
            'blog': 'blog.html'
        }
        return routes.get(endpoint, '#')

    env.globals['url_for'] = url_for
    env.globals['last_updated'] = get_last_commit_date()
    return env


def render_templates():
    env = make_env()
    # render index.html directly
    index_t = env.get_template('index.html')
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_t.render())

    # Generate CV content from cv.json
    cv_content = load_cv_content()
    
    # Load publications with metadata
    publications, has_equal_contrib = load_publications()
    
    # Load blog posts
    blog_posts, all_tags = load_blog_posts()
    print(f'Loaded {len(blog_posts)} blog posts for rendering')

    # render the generic pages
    for slug, ctx in PAGES.items():
        # if a dedicated template exists (e.g., research.html), prefer that
        template_name = f"{slug}.html"
        try:
            t = env.get_template(template_name)
            # Pass cv_content for the CV page
            if slug == 'cv':
                html = t.render(cv_content=cv_content, title='CV')
            elif slug == 'publications':
                html = t.render(publications=publications, has_equal_contrib=has_equal_contrib, title='Publications')
            elif slug == 'blog':
                html = t.render(posts=blog_posts, all_tags=all_tags, title='Blog')
            else:
                html = t.render(title=ctx['title'])
        except Exception as e:
            # fall back to generic page template
            print(f"  Warning: Error rendering {slug}: {e}")
            page_t = env.get_template('page.html')
            html = page_t.render(title=ctx['title'], body=ctx['body'])

        out_path = os.path.join(OUT, f"{slug}.html")
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)
    
    # Render individual blog post pages
    if blog_posts:
        blog_post_template = env.get_template('blog_post.html')
        for post in blog_posts:
            html = blog_post_template.render(post=post)
            out_path = os.path.join(OUT, f"blog_{post['slug']}.html")
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(html)


def main():
    # First, build CV PDF from source data (cv.json + roytburg.bib)
    build_cv_pdf()
    
    # Then render the static site
    ensure_out()
    copy_static()
    copy_pdfs()
    render_templates()
    print('Static site rendered to', OUT)


if __name__ == '__main__':
    main()
