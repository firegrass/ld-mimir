PROJECT = linkeddata

PROJECT_DIR = ./$(PROJECT)/

BUILD = build/

INTRODUCTION_CH = $(PROJECT_DIR)/introduction

PAGES_CH = $(PROJECT_DIR)/pages

MARKDOWN = $(INTRODUCTION_CH)/Introduction.md

PAGES = $(sort $(wildcard $(PAGES_CH)/*.md))

MARKDOWN += $(PAGES)


#RECS = $(sort $(dir $(wildcard $(GUIDANCE_DIR)chapters/recommendations/*/)))

#MARKDOWN += $(foreach rec,$(RECS),					\
#		$(rec)Set.md			  										\
#		$(rec)Discussion.md  										\
#		$(rec)Recommendation.md                 \
#		$(sort $(wildcard $(rec)*ES*.md)))

TEMPLATES = templates/

clean:

PANDOC_OPT = -r simple_tables+table_captions+yaml_metadata_block+tex_math_dollars+tex_math_single_backslash -s -S --normalize --smart -f markdown --standalone --toc

html: clean 
	    pandoc $(PANDOC_OPT) --template=templates/html.template -t html5 $(MARKDOWN) -o $(BUILD)/index.html 

all: html