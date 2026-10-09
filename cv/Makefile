PROJECT=cv
BIB=roytburg
PDFS_DIR=../pdfs

all: $(PDFS_DIR)/$(PROJECT).pdf

$(PROJECT).tex: $(PROJECT).json render-cv.py ../$(BIB).bib ../publications_meta.json Makefile
	python3 render-cv.py > $(PROJECT).tex

$(PROJECT).pdf: $(PROJECT).tex ../$(BIB).bib Makefile
	xelatex -interaction=nonstopmode -synctex=1 $(PROJECT).tex
	xelatex -interaction=nonstopmode -synctex=1 $(PROJECT).tex
	xelatex -interaction=nonstopmode -synctex=1 $(PROJECT).tex

# Copy final PDF to pdfs/ folder and clean up build artifacts
$(PDFS_DIR)/$(PROJECT).pdf: $(PROJECT).pdf
	@mkdir -p $(PDFS_DIR)
	cp $(PROJECT).pdf $(PDFS_DIR)/$(PROJECT).pdf
	@echo "CV saved to $(PDFS_DIR)/$(PROJECT).pdf"
	$(MAKE) clean-artifacts

# Clean only build artifacts, keep source files
clean-artifacts:
	rm -f $(PROJECT).aux $(PROJECT).bbl $(PROJECT).blg $(PROJECT).log $(PROJECT).out $(PROJECT).synctex.gz tmp.sed $(PROJECT).pdf

# Clean everything including generated tex
clean: clean-artifacts
	rm -f $(PROJECT).tex

# Full clean including output PDF
distclean: clean
	rm -f $(PDFS_DIR)/$(PROJECT).pdf

.PHONY: all clean clean-artifacts distclean
