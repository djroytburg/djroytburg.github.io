#!/usr/bin/env python3
"""Generate the website-aligned CV from the shared biography and publications."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cv = json.loads((ROOT / 'cv/cv.json').read_text())
meta = json.loads((ROOT / 'publications_meta.json').read_text())
entries = {}
for match in re.finditer(r'@\w+\{([^,]+),([^@]*)', (ROOT / 'roytburg.bib').read_text(), re.S):
    entries[match[1]] = dict(re.findall(r'(\w+)\s*=\s*\{([^}]*)\}', match[2]))

def esc(value):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}'}.get(c,c) for c in str(value).replace(r'\#','#'))
def link(url, label):
    return r'\href{' + url + '}{' + esc(label) + '}'
def section(title):
    print(r'\section*{' + esc(title) + '}')
def date(job, prefix):
    return f"{job[prefix+'-month']} {job[prefix+'-year']}"

print(r'''\documentclass[10pt,letterpaper]{article}
\usepackage[margin=0.65in]{geometry}
\usepackage{fontspec,xcolor,titlesec,needspace,fancyhdr}
\setmainfont{texgyrepagella}[Extension=.otf,UprightFont=*-regular,BoldFont=*-bold,ItalicFont=*-italic,BoldItalicFont=*-bolditalic]
\setsansfont{texgyreheros}[Extension=.otf,UprightFont=*-regular,BoldFont=*-bold,ItalicFont=*-italic,BoldItalicFont=*-bolditalic]
\definecolor{accent}{HTML}{000000}
\definecolor{ink}{HTML}{000000}
\definecolor{muted}{HTML}{000000}
\usepackage[colorlinks=true,urlcolor=accent,linkcolor=accent]{hyperref}
\hypersetup{pdftitle={Dani Roytburg — Curriculum Vitae},pdfauthor={Dani Roytburg}}
\color{ink}
\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}
\setlength{\emergencystretch}{2em}
\titleformat{\section}{\large\bfseries\color{accent}}{}{0pt}{}[\vspace{-4pt}\rule{\linewidth}{0.4pt}]
\titlespacing*{\section}{0pt}{10pt}{5pt}
\pagestyle{fancy}\fancyhf{}\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\scriptsize\sffamily\color{muted}Dani Roytburg · Curriculum Vitae}
\fancyfoot[R]{\scriptsize\sffamily\color{muted}\thepage}
\begin{document}
{\Huge\bfseries Dani Roytburg}\hfill{\small\sffamily\color{muted}CURRICULUM VITAE}\par
''')
print(r'{\small\sffamily '+ ' · '.join([link('mailto:'+cv['email'],cv['email']),link('https://'+cv['www'],cv['www']),link('https://github.com/'+cv['github'],'GitHub'),link('https://scholar.google.com/citations?user='+cv['scholar'],'Google Scholar')])+r'}\par')
print(esc(cv['summary']))
section('Education')
for d in cv['degrees']:
    print(r'\textbf{'+esc(d['school'])+r'}\hfill '+esc(d.get('note',d['year']))+r'\par')
    print(esc(d['degree']+' in '+d['discipline'])+(r' · \textit{'+esc(d['honors'])+'}' if d.get('honors') else '')+r'\par')
section('Research & Professional Experience')
for job in cv['employment']:
    print(r'\Needspace{5\baselineskip}')
    title=job['title']
    print(r'\textbf{'+esc(job['affiliation'])+r'}\hfill {\small\sffamily '+esc(date(job,'start')+' – '+(date(job,'end') if 'end-year' in job else 'Present'))+r'}\par')
    print(r'{\small\sffamily\color{muted}'+esc(title+' · '+job['location'])+r'}\par')
    print(esc(job['description'])+r'\par\vspace{3pt}')
print(r'\newpage')
section('Publications')
print(r'{\small\sffamily\color{muted}* Equal contribution / co-first authorship.}\par')
for group,label in [('under-review','Under review'),('conference-papers','Conference & workshop papers')]:
    print(r'\vspace{5pt}{\sffamily\bfseries '+esc(label)+r'}\par')
    for key in cv['bibliography'].get(group,[]):
        e=entries[key];m=meta.get(key,{})
        authors=[]
        for i,author in enumerate(e['author'].split(' and ')):
            parts=author.split(',');name=(' '.join(reversed([p.strip() for p in parts])))
            name=esc(name)
            if 'Roytburg' in name:name=r'\textbf{'+name+'}'
            if i in (m.get('equal_contribution') or []):name+=r'\textsuperscript{*}'
            authors.append(name)
        print(r'\Needspace{6\baselineskip}\textbf{'+esc(e['title'])+r'}\par')
        print(', '.join(authors)+r'.\par')
        print(r'\textit{'+esc(e.get('booktitle',e.get('journal','Under review')))+r'}, '+esc(e['year'])+r'.\par')
        if m.get('also_at'):
            print(r'{\footnotesize\color{muted}Also at: '+esc('; '.join(m['also_at']))+r'.}\par')
        links=[]
        for field,label in [('paper_url','Paper'),('blog_url','Blog post'),('website_url','Project website'),('code_url','Code')]:
            url=m.get(field) or (e.get('url') if field=='paper_url' else None)
            if url:
                if not url.startswith('http'):url='https://djroytburg.github.io/'+url
                links.append(link(url,label))
        print(r'{\small\sffamily '+' · '.join(links)+r'}\par\vspace{3pt}')
section('Awards')
for award in cv['awards']:
    years=award.get('year',', '.join(map(str,award.get('years',[]))))
    print(esc(award['title'])+r'\hfill '+esc(years)+r'\par')
section('Technical Skills')
print(esc(' · '.join(cv['skills'])))
print(r'\end{document}')
