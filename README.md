# Daniel Roytburg's Academic Homepage

A minimal academic personal website built with Flask (local dev) and rendered to static HTML for GitHub Pages.

## Structure

```
├── app.py              # Flask app for local development
├── render_static.py    # Static site generator (builds docs/)
├── templates/          # Jinja2 HTML templates
├── static/             # CSS and assets
├── cv/                 # CV LaTeX source (JSON → PDF)
├── pdfs/               # Generated PDFs (cv.pdf, resume)
├── roytburg.bib        # BibTeX bibliography
└── docs/               # Generated static site (served by GitHub Pages)
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask dev server
python3 app.py
# → http://localhost:5000

# Or generate static site
python3 render_static.py
open docs/index.html
```

## Deployment

Push to `master` branch. GitHub Actions automatically:
1. Builds CV PDF from `cv/cv.json` + `roytburg.bib`
2. Generates static HTML in `docs/`
3. Commits and deploys to GitHub Pages

## Updating Content

- **CV data**: Edit `cv/cv.json`
- **Publications**: Edit `roytburg.bib`
- **Page content**: Edit templates in `templates/`
- **Styling**: Edit `static/style.css`

## Acknowledgments

The CV generation system (`cv/` folder) is adapted from [Fernando Diaz's CV template](https://github.com/diazf/cv). Thanks to Fernando for making his LaTeX CV pipeline available!

## License

Content © Daniel Roytburg. Code structure may be reused with attribution.
