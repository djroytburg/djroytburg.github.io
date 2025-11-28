import os
import re
import json
from flask import Flask, render_template, url_for, send_from_directory

app = Flask(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CV HTML generation (same logic as render_static.py for consistency)
# ─────────────────────────────────────────────────────────────────────────────

def parse_bib_file(bib_path):
    """Parse a .bib file and return a dict of key -> entry data."""
    entries = {}
    if not os.path.exists(bib_path):
        return entries
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


def format_authors(author_str, highlight_name=None):
    authors = [a.strip() for a in author_str.split(' and ')]
    formatted = []
    for author in authors:
        if ',' in author:
            parts = author.split(',')
            name = f"{parts[1].strip()} {parts[0].strip()}"
        else:
            name = author
        if highlight_name and (highlight_name.lower() in name.lower() or 
                               any(p.lower() in name.lower() for p in highlight_name.split())):
            name = f'<span class="highlight">{name}</span>'
        formatted.append(name)
    
    if len(formatted) == 1:
        return formatted[0]
    elif len(formatted) == 2:
        return f"{formatted[0]} and {formatted[1]}"
    else:
        return ", ".join(formatted[:-1]) + f", and {formatted[-1]}"


def format_publication(entry, highlight_name=None):
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


def generate_cv_html():
    """Generate CV HTML content from cv.json and roytburg.bib."""
    root = os.path.dirname(__file__)
    cv_json_path = os.path.join(root, 'cv', 'cv.json')
    bib_path = os.path.join(root, 'roytburg.bib')
    
    if not os.path.exists(cv_json_path):
        return '<p>CV data not found.</p>'
    
    with open(cv_json_path, 'r') as f:
        cv_data = json.load(f)
    
    bib_entries = parse_bib_file(bib_path)
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
    
    # Experience
    if 'employment' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Experience</h2>''')
        for job in cv_data['employment']:
            start = f"{job['start-month']} {job['start-year']}"
            end = f"{job['end-month']} {job['end-year']}" if 'end-year' in job else "Present"
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
    
    # Publications
    if 'bibliography' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Publications</h2>''')
        bib = cv_data['bibliography']
        if 'conference-papers' in bib and bib['conference-papers']:
            html_parts.append('        <h3>Conference Papers</h3>')
            for key in bib['conference-papers']:
                if key in bib_entries:
                    html_parts.append('        ' + format_publication(bib_entries[key], name))
        if 'theses' in bib and bib['theses']:
            html_parts.append('        <h3>Theses</h3>')
            for key in bib['theses']:
                if key in bib_entries:
                    html_parts.append('        ' + format_publication(bib_entries[key], name))
        html_parts.append('      </section>')
    
    # Awards
    if 'awards' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Awards & Recognition</h2>
        <ul class="cv-list">''')
        for award in cv_data['awards']:
            year_str = str(award.get('year', '')) or ', '.join(str(y) for y in award.get('years', []))
            html_parts.append(f'          <li>{award["title"]}, {year_str}</li>')
        html_parts.append('        </ul>\n      </section>')
    
    # Skills
    if 'skills' in cv_data:
        html_parts.append('''
      <section class="cv-section">
        <h2>Skills</h2>
        <p class="cv-skills">''' + ' · '.join(cv_data['skills']) + '</p>\n      </section>')
    
    return '\n'.join(html_parts)


# ─────────────────────────────────────────────────────────────────────────────
# Flask Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/pdfs/<path:filename>')
def pdfs(filename):
    """Serve files from pdfs/ folder."""
    return send_from_directory('pdfs', filename)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/publications')
def publications():
    return render_template('publications.html')


@app.route('/cv')
def cv():
    cv_content = generate_cv_html()
    return render_template('cv.html', cv_content=cv_content)


@app.route('/research')
def research():
    return render_template('research.html')


@app.route('/blog')
def blog():
    return render_template('blog.html')


if __name__ == '__main__':
    app.run(debug=True)
