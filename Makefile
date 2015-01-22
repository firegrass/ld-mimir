PROJECT = linkeddata

PROJECT_DIR = docs/$(PROJECT)/

BUILD = docs/export/

INTRODUCTION_CH = $(PROJECT_DIR)/introduction

PAGES_CH = $(PROJECT_DIR)/pages

MARKDOWN = $(INTRODUCTION_CH)/Introduction.md

PAGES = $(sort $(wildcard $(PAGES_CH)/*.md))

MARKDOWN += $(PAGES)


TEMPLATES = docs/templates/

clean:

PANDOC_OPT = -r simple_tables+table_captions+yaml_metadata_block+tex_math_dollars+tex_math_single_backslash -s -S --normalize --smart -f markdown --standalone --toc

html: clean 
	    pandoc $(PANDOC_OPT) --template=$(TEMPLATES)/html.template -t html5 $(MARKDOWN) -o $(BUILD)/index.html 

stash:
	-git stash

ghpages: 
		git stash ; \
		git checkout gh-pages ; \ 
		git checkout master -- docs/export ; \
		mv docs/export/* . ; \
		git add --all ; \
		git commit -m "Automated update of gh-pages" ; \
		git push origin gh-pages ; \
		git checkout master

pop: 
	-git stash pop


npm:
		cd src/gore.io && npm install

publish: stash ghpages pop

all: html publish npm
