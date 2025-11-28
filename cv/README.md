# CV Generation# Curriculum Vitae

![cv image](https://github.com/diazf/cv/raw/master/cv.png)

This folder contains the LaTeX CV generation system, adapted from [Fernando Diaz's CV template](https://github.com/diazf/cv).

Package to render CV. 

## How it works

## Dependencies

1. `cv.json` — Structured CV data (education, employment, publications, etc.)* [MacTeX](http://www.tug.org/mactex/)

2. `make-tex.py` — Python script that converts JSON → LaTeX* [bibexport](https://ctan.org/pkg/bibexport)

3. `cv-header.tex` — LaTeX preamble with styling* [python3](https://www.python.org/download/releases/3.0/)

4. `Makefile` — Orchestrates the build process* regular unix tools like `make`, `sed`, etc



## Building## Instructions



The CV is built automatically by `render_static.py` in the parent directory. You can also build manually:### Edit `cv.json`



```bashReplace `cv.json` with your CV information.  

make        # Builds PDF → ../pdfs/cv.pdf

make clean  # Removes LaTeX artifactsThe value for `bib` should be the basename of the BibTeX library that includes all of your citations.  This project assumes that your master BibTeX file lives one directory up from the `cv/` folder (i.e., `../<bib>.bib`). That keeps the large shared bibliography outside the build directory.

```

If you prefer not to place the file in the parent directory, you can instead set your `BIBINPUTS` environment variable to point to the directory that contains your BibTeX library. Either approach allows LaTeX/bibtex/bibexport to find the master `.bib` without storing it in the `cv/` build folder.

## Dependencies

The `bibliography` section of your JSON file should just be a lists of the citation keys in your BibTeX library.  Within each bibliographic section, citations will preserve the order in the JSON file.  

- Python 3

- XeLaTeX (via TeX Live or MacTeX)### Edit `Makefile`

- BibTeX

Replace `BIB` definition with the basename of the BibTex library. It should be same as in the previous section.

## Acknowledgments

### Run `make`

Thanks to [Fernando Diaz](https://github.com/diazf) for the original CV pipeline.

Build the CV in the same directory as `Makefile` and everything else.  Your CV will be in `cv.pdf`.

## Notes

I've tried to include checks in case you don't want some of the sections I have.

Only tested on macOS.