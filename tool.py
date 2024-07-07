"""
Script made to work with project compilation and management

Copyright (c) 2023 VYT (vytdev)
Part of the VYT Documentation project
Protected under the GNU General Public License
Project at: <https://github.com/vytdev/vytdev.github.io>
"""

import os
import shutil
import argparse
import sys

# load modules from vendor folder
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))

# some variables
SOURCE_FOLDER = "src"
LAYOUT_FOLDER = "layout"
VENDOR_FOLDER = "vendor"
DOCS_FOLDER   = "docs"
OUTPUT_FOLDER = "site"
DIST_FOLDER   = "dist"
DB_FOLDER     = "db"

f_redirect = os.path.join(DB_FOLDER, "redirect.json")
f_deletion = os.path.join(DB_FOLDER, "deletions.json")

domain = "vytdev.github.io"

# only run as main
if __name__ != "__main__":
	exit("need to run as main")

# parse arguments on cli
parser = argparse.ArgumentParser(description="website toolkit.", usage="%(prog)s [options]")
# options
parser.add_argument("-b", "--build", action="store_true", help="build the site")
parser.add_argument("-c", "--clean", action="store_true", help="clean the workspace")
parser.add_argument("-p", "--pack", action="store_true", help="package distribution files")
parser.add_argument("-d", "--deploy", action="store_true", help="deploy to GitHub Pages")
# sub commands
subs = parser.add_subparsers(dest="sub")
# mv sub command
mv = subs.add_parser("mv", help="move documents")
mv.add_argument("src", help="path of the source document")
mv.add_argument("dest", help="where to place the document")
# rm sub command
rm = subs.add_parser("rm", help="delete documents")
rm.add_argument("doc", help="path to the document")
# get args
args = parser.parse_args()

# cd this program to the project folder
os.chdir(os.path.normpath(os.path.dirname(__file__)))

# mv sub command
if args.sub == "mv":
	import json
	import time

	# load redirect mappings
	if os.path.exists(f_redirect):
		with open(f_redirect, "r", encoding="utf-8") as f:
			r_redirect = json.load(f)
	else:
		r_redirect = {}

	# check if markdown
	if not args.src.endswith(".md"):
		exit("src not a markdown document")
	if not args.dest.endswith(".md"):
		exit("dest not a markdown document")

	# paths to use
	src = os.path.normpath(os.path.join(DOCS_FOLDER, args.src))
	dest = os.path.normpath(os.path.join(DOCS_FOLDER, args.dest))

	# source page not found
	if not os.path.isfile(src):
		exit("page not found")

	# create record key
	a = os.path.normpath(args.src.replace("\\", "/"))[:-2] + "html"
	b = os.path.normpath(args.dest.replace("\\", "/"))[:-2] + "html"
	r_redirect[a] = b

	# confirm before moving
	if input("are you sure you want to move this page? [y/n]: ").lower()[0] != "y":
		print("aborting ...")
		exit(0)

	# remove redirect from record if already exists for path
	if dest in r_redirect:
		del r_redirect[dest]

	# ensure parent dir exist
	dirname = os.path.dirname(dest)
	if not os.path.isdir(dirname):
		os.makedirs(dirname)

	shutil.move(src, dest)

	# update records
	print("updating records ...")
	with open(f_redirect, "w", encoding="utf-8") as f:
		json.dump(r_redirect, f, separators=(",", ":"))

	print("%s has been moved to: %s" % (a, b))
	exit(0)

# rm sub command
if args.sub == "rm":
	import json

	# load deletion records
	if os.path.exists(f_deletion):
		with open(f_deletion, "r", encoding="utf-8") as f:
			r_deletion = json.load(f)
	else:
		r_deletion = []

	# check if markdown
	if not args.doc.endswith(".md"):
		exit("doc not a markdown document")

	# paths to use
	doc = os.path.normpath(os.path.join(DOCS_FOLDER, args.doc))

	# source page not found
	if not os.path.isfile(doc):
		exit("page not found")

	# get record key
	key = os.path.normpath(args.doc.replace("\\", "/"))[:-2] + "html"

	# confirm before deleting
	if input("are you sure you want to delete this page? [y/n]: ").lower()[0] != "y":
		print("aborting ...")
		exit(0)

	# put it to record
	if key not in r_deletion:
		r_deletion.append(key)

	os.unlink(doc)

	# update records
	print("updating records ...")
	with open(f_deletion, "w", encoding="utf-8") as f:
		json.dump(r_deletion, f, separators=(",", ":"))

	print("%s has been deleted" % (key))
	exit(0)

# do clean up
if args.clean:
	print("cleaning worktree ...")

	# for OUTPUT_FOLDER:
	if os.path.exists(OUTPUT_FOLDER):
		# remove directory
		if os.path.isdir(OUTPUT_FOLDER):
			shutil.rmtree(OUTPUT_FOLDER)
		# maybe OUTPUT_FOLDER is a file or a link
		else:
			os.unlink(OUTPUT_FOLDER)

	# for DIST_FOLDER:
	if os.path.exists(DIST_FOLDER):
		# remove directory
		if os.path.isdir(DIST_FOLDER):
			shutil.rmtree(DIST_FOLDER)
		# maybe DIST_FOLDER is a file or a link
		else:
			os.unlink(DIST_FOLDER)

	print("worktree cleaned")

# do build
if args.build:

	print("initializing ...")

	# load required modules
	try:
		import jinja2
		import markdown
		from porter import PorterStemmer
	except ImportError:
		exit("failed to import required dependencies for build")

	# setup markdown
	import json
	import re
	import pathlib
	import time
	import unicodedata
	import ziamath.zmath as zm
	import xml.etree.ElementTree as ET
	from urllib.parse import urlparse, urlunparse
	from zlib import crc32

	# load gemoji icon db
	with open(os.path.join("vendor", "gemoji", "remapped.json"), "r", encoding="utf-8") as f:
		gemoji = json.load(f)

	# :icon: processor
	class IconInlineProcessor(markdown.inlinepatterns.InlineProcessor):
		def __init__(self, *args, **kwargs):
			super().__init__(r":(\w+):", *args, **kwargs)

		def handleMatch(self, m, data):
			icon = m.group(1).lower()
			txt = gemoji[icon] if icon in gemoji else m.group(0)
			return txt, m.start(0), m.end(0)

	# substitutes html
	class HTMLEntitiesInlineProcessor(markdown.inlinepatterns.InlineProcessor):
		def __init__(self, subs, *args, **kwargs):
			self.replacements = subs
			self.replacements.update(self.DEFAULTS)

			regex = (
				r"(%s|["
				r"\u2200-\u22FF" # math symbols
				r"\u0370-\u03FF" # greek letters
				r"\u20A0-\u20CF" # currency symbols
				r"\u2190-\u21FF" # arrows
				r"\u2600-\u26FF" # misc symbols
				r"])" % ("|".join(self.replacements.keys()))
			)
			super().__init__(regex, re.UNICODE, *args, **kwargs)

		DEFAULTS = {
			# Common charcaters, see: https://www.w3schools.com/html/html_entities.asp
			"\u003C": "lt", # LESS THAN
			"\u003E": "gt", # GREATER THAN
			"\u0026": "amp", # AMPERSAND
			"\u0022": "quot", # DOUBLE QUOTATION MARKS
			"\u0027": "apos", # APOSTROE
			"\u00A9": "copy", # COPYRIGHT
			"\u00AE": "reg", # REGISTERED TRADEMARK
			"\u2122": "trade", # TRADEMARK
			# Math characters, see: https://www.w3schools.com/charsets/ref_utf_math.asp
			"\u2200": "forall", # FOR ALL
			"\u2202": "part", # PARTIAL DIFFERENTIAL
			"\u2203": "exist", # THERE EXISTS
			"\u2205": "empty", # EMPTY SET
			"\u2207": "nabla", # NABLA
			"\u2208": "isin", # ELEMENT OF
			"\u2209": "notin", # NOT AN ELEMENT OF
			"\u220B": "ni", # CONTAINS AS MEMBER
			"\u220F": "prod", # N-ARY PRODUCT
			"\u2211": "sum", # N-ARY SUMMATION
			"\u2212": "minus", # MINUS SIGN
			"\u2217": "lowast", # ASTERISK OPERATOR
			"\u221A": "radic", # SQUARE ROOT
			"\u221D": "prop", # PROPORTIONAL TO
			"\u221E": "infin", # INFINITY
			"\u2220": "ang", # ANGLE
			"\u2227": "and", # LOGICAL AND
			"\u2228": "or", # LOGICAL OR
			"\u2229": "cap", # INTERSECTION
			"\u222A": "cup", # UNION
			"\u222B": "int", # INTEGRAL
			"\u2234": "there4", # THEREFORE
			"\u223C": "sim", # TILDE OPERATOR
			"\u2245": "cong", # APPROXIMATELY EQUAL TO
			"\u2248": "asymp", # ALMOST EQUAL TO
			"\u2260": "ne", # NOT EQUAL TO
			"\u2261": "equiv", # IDENTICAL TO
			"\u2264": "le", # LESS-THAN OR EQUAL TO
			"\u2265": "ge", # GREATER-THAN OR EQUAL TO
			"\u2282": "sub", # SUBSET OF
			"\u2283": "sup", # SUPERSET OF
			"\u2284": "nsub", # NOT A SUBSET OF
			"\u2286": "sube", # SUBSET OF OR EQUAL TO
			"\u2287": "supe", # SUPERSET OF OR EQUAL TO
			"\u2295": "oplus", # CIRCLED PLUS
			"\u2297": "otimes", # CIRCLED TIMES
			"\u22A5": "perp", # UP TACK
			"\u22C5": "sdot", # DOT OPERATOR
			# Greek characters, see: https://www.w3schools.com/charsets/ref_utf_greek.asp
			"\u0391": "Alpha", # GREEK CAPITAL LETTER ALPHA
			"\u0392": "Beta", # GREEK CAPITAL LETTER BETA
			"\u0393": "Gamma", # GREEK CAPITAL LETTER GAMMA
			"\u0394": "Delta", # GREEK CAPITAL LETTER DELTA
			"\u0395": "Epsilon", # GREEK CAPITAL LETTER EPSILON
			"\u0396": "Zeta", # GREEK CAPITAL LETTER ZETA
			"\u0397": "Eta", # GREEK CAPITAL LETTER ETA
			"\u0398": "Theta", # GREEK CAPITAL LETTER THETA
			"\u0399": "Iota", # GREEK CAPITAL LETTER IOTA
			"\u039A": "Kappa", # GREEK CAPITAL LETTER KAPPA
			"\u039B": "Lambda", # GREEK CAPITAL LETTER LAMBDA
			"\u039C": "Mu", # GREEK CAPITAL LETTER MU
			"\u039D": "Nu", # GREEK CAPITAL LETTER NU
			"\u039E": "Xi", # GREEK CAPITAL LETTER XI
			"\u039F": "Omicron", # GREEK CAPITAL LETTER OMICRON
			"\u03A0": "Pi", # GREEK CAPITAL LETTER PI
			"\u03A1": "Rho", # GREEK CAPITAL LETTER RHO
			"\u03A3": "Sigma", # GREEK CAPITAL LETTER SIGMA
			"\u03A4": "Tau", # GREEK CAPITAL LETTER TAU
			"\u03A5": "Upsilon", # GREEK CAPITAL LETTER UPSILON
			"\u03A6": "Phi", # GREEK CAPITAL LETTER PHI
			"\u03A7": "Chi", # GREEK CAPITAL LETTER CHI
			"\u03A8": "Psi", # GREEK CAPITAL LETTER PSI
			"\u03A9": "Omega", # GREEK CAPITAL LETTER OMEGA
			"\u03B1": "alpha", # GREEK SMALL LETTER ALPHA
			"\u03B2": "beta", # GREEK SMALL LETTER BETA
			"\u03B3": "gamma", # GREEK SMALL LETTER GAMMA
			"\u03B4": "delta", # GREEK SMALL LETTER DELTA
			"\u03B5": "epsilon", # GREEK SMALL LETTER EPSILON
			"\u03B6": "zeta", # GREEK SMALL LETTER ZETA
			"\u03B7": "eta", # GREEK SMALL LETTER ETA
			"\u03B8": "theta", # GREEK SMALL LETTER THETA
			"\u03B9": "iota", # GREEK SMALL LETTER IOTA
			"\u03BA": "kappa", # GREEK SMALL LETTER KAPPA
			"\u03BB": "lambda", # GREEK SMALL LETTER LAMBDA
			"\u03BC": "mu", # GREEK SMALL LETTER MU
			"\u03BD": "nu", # GREEK SMALL LETTER NU
			"\u03BE": "xi", # GREEK SMALL LETTER XI
			"\u03BF": "omicron", # GREEK SMALL LETTER OMICRON
			"\u03C0": "pi", # GREEK SMALL LETTER PI
			"\u03C1": "rho", # GREEK SMALL LETTER RHO
			"\u03C2": "sigmaf", # GREEK SMALL LETTER FINAL SIGMA
			"\u03C3": "sigma", # GREEK SMALL LETTER SIGMA
			"\u03C4": "tau", # GREEK SMALL LETTER TAU
			"\u03C5": "upsilon", # GREEK SMALL LETTER UPSILON
			"\u03C6": "phi", # GREEK SMALL LETTER PHI
			"\u03C7": "chi", # GREEK SMALL LETTER CHI
			"\u03C8": "psi", # GREEK SMALL LETTER PSI
			"\u03C9": "omega", # GREEK SMALL LETTER OMEGA
			"\u03D1": "thetasym", # GREEK THETA SYMBOL
			"\u03D2": "upsih", # GREEK UPSILON WITH HOOK SYMBOL
			"\u03D5": "straightphi", # GREEK PHI SYMBOL
			"\u03D6": "piv", # GREEK PI SYMBOL
			"\u03DC": "Gammad", # GREEK LETTER DIGAMMA
			"\u03DD": "gammad", # GREEK SMALL LETTER DIGAMMA
			"\u03F0": "varkappa", # GREEK KAPPA SYMBOL
			"\u03F1": "varrho", # GREEK RHO SYMBOL
			"\u03F5": "straightepsilon", # GREEK LUNATE EPSILON SYMBOL
			"\u03F6": "backepsilon", # GREEK REVERSED LUNATE EPSILON SYMBOL
			# Currency symbols, see: https://www.w3schools.com/charsets/ref_utf_currency.asp
			"\u00A2": "cent", # CENT
			"\u00A3": "pound", # POUND
			"\u00A5": "yen", # YEN
			"\u20AC": "euro", # EURO
			# Arrows, see: https://www.w3schools.com/charsets/ref_utf_arrows.asp
			"\u2190": "larr", # LEFTWARDS ARROW
			"\u2191": "uarr", # UPWARDS ARROW
			"\u2192": "rarr", # RIGHTWARDS ARROW
			"\u2193": "darr", # DOWNWARDS ARROW
			"\u2194": "harr", # LEFT RIGHT ARROW
			"\u21B5": "crarr", # DOWNWARDS ARROW WITH CORNER LEFTWARDS
			"\u21D0": "lArr", # LEFTWARDS DOUBLE ARROW
			"\u21D1": "uArr", # UPWARDS DOUBLE ARROW
			"\u21D2": "rArr", # RIGHTWARDS DOUBLE ARROW
			"\u21D3": "dArr", # DOWNWARDS DOUBLE ARROW
			"\u21D4": "hArr", # LEFT RIGHT DOUBLE ARROW
			# Miscellaneous symbols, see: https://www.w3schools.com/charsets/ref_utf_symbols.asp
			"\u2660": "spades", # BLACK SPADE SUIT
			"\u2663": "clubs", # BLACK CLUB SUIT
			"\u2665": "hearts", # BLACK HEART SUIT
			"\u2666": "diams", # BLACK DIAMOND SUIT
		}

		def handleMatch(self, m, data):
			char = m.group(1)
			sub = "&%s;" % (self.replacements.get(char, "#" + str(ord(char))))
			return sub, m.start(0), m.end(0)

	# math latex inline processor
	class MathInlineProcessor(markdown.inlinepatterns.InlineProcessor):
		def __init__(self, *args, **kwargs):
			super().__init__(r"(\$\$)(?!\$\$})(.+?)(?<!\$\$)\1", *args, **kwargs)

		def handleMatch(self, m, data):
			el = zm.Latex(m.group(2)).svgxml()
			el.set("class", "math")
			return el, m.start(0), m.end(0)

	# inline element processor
	class InlineElementProcessor(markdown.inlinepatterns.InlineProcessor):
		def __init__(self, element, idx, *args, **kwargs):
			super().__init__(*args, **kwargs)
			self.element = element
			self.idx = idx

		def handleMatch(self, m, data):
			el = ET.Element(self.element)
			el.text = m.group(self.idx)
			return el, m.start(0), m.end(0)

	# handle strikethrough and sub
	class TildeInlineProcessor(markdown.inlinepatterns.AsteriskProcessor):
		PATTERNS = [
			markdown.inlinepatterns.EmStrongItem(re.compile(r"(~)\1{2}(.+?)\1(.*?)\1{2}", re.DOTALL | re.UNICODE), "double", "del,sub"),
			markdown.inlinepatterns.EmStrongItem(re.compile(r"(~)\1{2}(.+?)\1{2}(.*?)\1", re.DOTALL | re.UNICODE), "double", "sub,del"),
			markdown.inlinepatterns.EmStrongItem(re.compile(r"(?<!\w)(~)\1(?!\1)(.+?)(?<!\w)\1(?!\1)(.+?)\1{3}(?!\w)", re.DOTALL | re.UNICODE), "double2", "del,sub"),
			markdown.inlinepatterns.EmStrongItem(re.compile(r"(?<!\w)(~{2})(?!~)(.+?)(?<!~)\1(?!\w)", re.DOTALL | re.UNICODE), "single", "del"),
			markdown.inlinepatterns.EmStrongItem(re.compile(r"(~)(?!~)(.+?)(?<!~)\1", re.DOTALL | re.UNICODE), "single", "sub")
		]

	# create task lists like on GitHub Flavored Markdown
	class TaskListBlockProcessor(markdown.blockprocessors.BlockProcessor):
		def __init__(self, *args):
			super().__init__(*args)
			self.INDENT = re.compile(r"^[ ]{%d,%d}(?<![^\s])(.*)" % (self.tab_length, self.tab_length * 2 - 1))
			self.ITEM = re.compile(r"^[*+-][ ]*\[(x| )\][ ]+?(.*)", re.IGNORECASE)
			self.TAB = " " * self.tab_length

		def test(self, parent, block):
			return bool(self.ITEM.match(block))

		def run(self, parent, blocks):
			block = blocks.pop(0)
			lines = []
			for line in block.split("\n"):
				item = self.ITEM.match(line)
				if item:
					lines.append([
						item.group(1).lower() == "x",
						item.group(2)
					])
				elif self.INDENT.match(line):
					if lines[-1][1].startswith(self.TAB):
						lines[-1][1] = lines[-1][1] + "\n" + line[self.tab_length:]
					else:
						lines.append([ None, line ])
				else:
					lines[-1][1] = lines[-1][1] + "\n" + line
			sibling = self.lastChild(parent)

			if sibling is not None and sibling.tag == "ul":
				lst = sibling
				if lst[-1].text:
					p = ET.Element("p")
					p.text = lst[-1].text
					lst[-1].text = ""
					lst[-1].insert(0, p)
				lch = self.lastChild(lst[-1])
				if lch is not None and lch.tail:
					p = ET.SubElement(lst[-1], "p")
					p.text = lch.tail.lstrip()
					lch.tail = ""
				li = ET.SubElement(lst, "li")
				li.set("class", "taskitem")
				checkbox = ET.SubElement(li, "input")
				checkbox.set("type", "checkbox")
				checkbox.set("disabled", "")
				self.parser.state.set("looselist")
				ischecked, firstitem = lines.pop(0)
				if ischecked:
					checkbox.set("checked", "checked")
				self.parser.parseBlocks(li, [firstitem])
				self.parser.state.reset()
			elif parent.tag == "ul":
				lst = parent
			else:
				lst = ET.SubElement(parent, "ul")
				lst.set("class", "tasklist")

			self.parser.state.set("list")
			for check, content in lines:
				if content.startswith(self.TAB):
					self.parser.parseBlocks(lst[-1], [content[self.tab_length:]])
				elif check is not None:
					item = ET.SubElement(lst, "li")
					item.set("class", "taskitem")
					checkbox = ET.SubElement(item, "input")
					if check:
						checkbox.set("checked", "checked")
					checkbox.set("type", "checkbox")
					checkbox.set("disabled", "")
					self.parser.parseBlocks(item, [content])
			self.parser.state.reset()

	# put tables in a div
	class TableWrapperTreeprocessor(markdown.treeprocessors.Treeprocessor):
		def run(self, root):
			# wrap every tables to handle overflow

			for idx, val in enumerate(root):

				if val.tag != "table" or val.get("class") == "snippettable":
					continue

				root.remove(val)
				wrapper = ET.Element("div")
				wrapper.set("class", "table")
				wrapper.append(val)
				root.insert(idx, wrapper)

	# process footnote block
	class CustomFootnotesTreeprocessor(markdown.treeprocessors.Treeprocessor):
		def run(self, root):
			# iterate through all footnote divs

			for div in root.findall(".//div[@class='footnote']"):

				p = ET.Element("p")
				strong = ET.SubElement(p, "strong")
				strong.text = "Footnotes"
				div.insert(1, p)

	# rename links: *.md -> *.html
	class RenameMarkdownLinksTreerocessor(markdown.treeprocessors.Treeprocessor):
		def run(self, root):
			# iterate through all anchor elements

			for elem in root.findall(".//a"):
				if "href" in elem.attrib:
					href = elem.attrib["href"]

					url = urlparse(href)

					# check for conditions
					if not url.scheme and url.path.endswith(".md"):

							# replace .md links to .html
							elem.attrib["href"] = urlunparse(
								url._replace(path=url.path[:-2] + "html")
							)

					# possible external link, open new tab
					if url.scheme:
						elem.set("target", "_blank")

	class CustomExtension(markdown.extensions.Extension):
		def extendMarkdown(self, md):
			md.registerExtension(self)
			self.md = md
			self.reset()
			# add to escaped chars
			md.ESCAPED_CHARS += ["~", "=", "*"]
			# inline processors
			md.inlinePatterns.register(IconInlineProcessor(md), "icons", 200)
			md.inlinePatterns.register(MathInlineProcessor(md), "math", 200)
			md.inlinePatterns.register(InlineElementProcessor("sup", 2, r"(\^)(?!\^)(.+?)(?<!\^)\1"), "sup", 40)
			md.inlinePatterns.register(InlineElementProcessor("mark", 2, r"(==)(?!==)(.+?)(?<!==)\1"), "mark", 30)
			md.inlinePatterns.register(TildeInlineProcessor(r"~"), "tilde", 40)
			md.inlinePatterns.register(HTMLEntitiesInlineProcessor({}), "entities", 95)
			# block processors
			md.parser.blockprocessors.register(TaskListBlockProcessor(md.parser), "tasklist", 100)
			# tree processors
			md.treeprocessors.register(TableWrapperTreeprocessor(md), "table_wrapper", 0)
			md.treeprocessors.register(CustomFootnotesTreeprocessor(md), "custom_footnotes", 32)
			md.treeprocessors.register(RenameMarkdownLinksTreerocessor(md), "rename_md_links", 10)

		def reset(self):
			self.md.current_loc = None

	md = markdown.Markdown(extensions=[
		CustomExtension(), "extra", "admonition", "toc", "meta", "sane_lists", "wikilinks",
		"codehilite", "smarty"
	], extension_configs={
		"extra": {
			"footnotes": {
				"PLACE_MARKER": "[FOOTNOTES]",
				"UNIQUE_IDS": True
			}
		},
		"toc": {
			"marker": "",
			"permalink": True,
			"permalink_title": "Permanent link to this reference."
		},
		"wikilinks": {
			"base_url": "/wiki/",
			"end_url": ".html"
		},
		"codehilite":{
			"css_class": "snippet",
			"linenums": False,
			"guess_lang": False
		}
	})

	# setup jinja2

	# support resolving urls
	@jinja2.pass_context
	def url_filter(context, value):
		# absolute path
		if "loc_abspath" in context and context["loc_abspath"]:
			return "/" + value

		# relative path
		return str(pathlib.PosixPath(os.path.relpath(value, start=context["loc"])))[3:]

	# setup env
	env = jinja2.Environment(loader=jinja2.FileSystemLoader([
		LAYOUT_FOLDER,
		DOCS_FOLDER
	]), auto_reload=False)
	env.filters["url"] = url_filter

	# base template
	base_template = env.get_template("base.jinja2")
	# redirect template
	redirect_template = env.get_template("redirect.jinja2")
	# deleted pages template
	deleted_pages_template = env.get_template("deleted.jinja2")
	# sitemap template
	sitemap_template = env.get_template("sitemap.xml")

	stemmer = PorterStemmer()

	# objects needed for indexing
	punctuation = re.compile("[\\s~`’‘|^°{}[\\]()<>\\\\%@#$&\\-+=/*\"':;!?.,]+")

	# contractions
	contractions = [
		(re.compile(r"n't\b"), " not "),
		(re.compile(r"can't\b"), "can not "),
		(re.compile(r"'ll\b"), " will "),
		(re.compile(r"'s\b"), " is "),
		(re.compile(r"'re\b"), " are "),
		(re.compile(r"'ve\b"), " have "),
		(re.compile(r"'m\b"), " am "),
		(re.compile(r"'d\b"), " had "),
		# full-word
		(re.compile(r"\bcannot\b"), "can not"),
		(re.compile(r"\bgonna\b"), "going to"),
		(re.compile(r"\bwanna\b"), "want to")
	]

	stopwords = ["about","above","after","again","all","also","am","an","and",
		"another","any","are","as","at","be","because","been","before","being","below",
		"between","both","but","by","came","can","cannot","come","could","did","do",
		"does","doing","during","each","few","for","from","further","get","got","has",
		"had","he","have","her","here","him","himself","his","how","if","in","into",
		"is","it","its","itself","like","make","many","me","might","more","most","much",
		"must","my","myself","never","now","of","on","only","or","other","our","ours",
		"ourselves","out","over","own","said","same","see","should","since","so","some",
		"still","such","take","than","that","the","their","theirs","them","themselves",
		"then","there","these","they","this","those","through","to","too","under","until",
		"up","very","was","way","we","well","were","what","where","when","which","while",
		"who","whom","with","would","why","you","your","yours","yourself","a","b","c",
		"d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v",
		"w","x","y","z","_"
	]

	metare = re.compile( # regex for removing metadata in markdown files
		r"^-{3}?(\s.*)?" # begin
		r"(\n[ ]{0,3}[A-Za-z0-9_-]+:\s*.*" # meta
		r"(\n[ ]{4,}.*)*?)*" # more
		r"\n(\n|(-{3}|\.{3})(\s.*)?)" # end
	, flags=re.M)

	# the search index
	search_index = {
		"avgdl": 0,       # avgdl
		"corpusSize": 0,  # N
		"docs": {},       # { docNum: [ "docId", |D| ] }
		"terms": {}       # { "term": [ [ docNum, termFreq ], ... ] }
	}
	# record total length of docs
	total_length = 0

	# map identifiers
	identifiers = {}
	# map data index
	data_index = {}
	# search suggestions
	search_suggestions = []

	# store sitemap info
	sitemap = []

	# base 62 charset to use
	base62charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

	# function to remap toc
	def remap_toc(toclist):
		newtoc = []
		for item in toclist:
			childs = remap_toc(item["children"])
			del item["children"]
			newtoc.append(item)
			for child in childs:
				newtoc.append(child)
		return newtoc

	# custom json.dump
	def stringify(obj):
		if isinstance(obj, dict):
			return "{" + ",".join("%s:%s" % (stringify(k), stringify(v)) for k, v in obj.items()) +"}"
		if isinstance(obj, list):
			return "[" + ",".join(stringify(el) for el in obj) + "]"
		if isinstance(obj, bool):
			return "true" if obj else "false"
		if isinstance(obj, int) or isinstance(obj, float):
			return f"{obj}"
		if isinstance(obj, str):
			return json.dumps(obj)
		return "null"

	print("generator loaded")

	# load record files
	print("loading records ...")

	# load list of deleted documents
	if os.path.exists(f_deletion):
		with open(f_deletion, "r", encoding="utf-8") as f:
			r_deletion = json.load(f)
	else:
		r_deletion = {}

	# load redirect mappings
	if os.path.exists(f_redirect):
		with open(f_redirect, "r", encoding="utf-8") as f:
			r_redirect = json.load(f)
	else:
		r_redirect = {}

	# copy static source files
	print("copying source files ...")
	shutil.copytree(SOURCE_FOLDER, OUTPUT_FOLDER)

	# create raw search.html page
	with open(os.path.join(OUTPUT_FOLDER, "search.html"), "w", encoding="utf-8") as f:
		f.write(env.get_template("search.html").render(
			loc="search.html",
			search_page=True
		))

	# create raw 404.html page
	with open(os.path.join(OUTPUT_FOLDER, "404.html"), "w", encoding="utf-8") as f:
		f.write(env.get_template("404.html").render(
			loc="404.html",
			loc_abspath=True
		))

	# compile source markdown files
	print("building ...")

	# process markdown documents
	for root, dirs, files in os.walk(DOCS_FOLDER):
		root    = pathlib.Path(root)
		relroot = root.relative_to(DOCS_FOLDER)
		destdir = OUTPUT_FOLDER / relroot

		# wiki / hello / parentdir /
		parenNav = []
        # subfolders
		parenNav += [
			[str(x / "index.html"), x.name or "Docs"]
            for x in relroot.parents][::-1]
		# current folder
		if relroot != '.':
			parenNav += [[str(relroot / "index.html"), relroot.name or "Docs"]]

		for file in files:

			if not file.endswith(".md"):
				continue

			# some paths
			dest = relroot / (file[:-2] + "html")
			parent_dir = dest.parent
			srcpath = root / file
			dstr = str(dest)

			# make sure parent folder exist
			if not os.path.isdir(OUTPUT_FOLDER / parent_dir):
				os.makedirs(OUTPUT_FOLDER / parent_dir)

			# get unique crc32 hash for file path and encode it with base62 to get
			# a very short unique id for the document
			crc = crc32(dstr.encode())
			ident = ""
			while crc > 0:
				digit = crc % 62
				ident = base62charset[digit] + ident
				crc //= 62

			# record this for shortener links
			identifiers[ident] = dstr

			print(f"file: {srcpath}")

			# convert markdown document
			with open(srcpath, "r", encoding="utf-8") as f:
				content = f.read()
				html = md.convert(content)

			# get writters list
			authors = md.Meta.get("authors", [])

			# get keywords
			keywords = []
			if "keywords" in md.Meta:
				for line in md.Meta["keywords"]:
					keywords += line.split(", ")

			# get timestamps
			timeformat = "%A, %B %d %Y"
			created = time.strftime(timeformat, time.strptime(md.Meta["created"][0], "%d-%m-%Y")) if "created" in md.Meta else "Unknown"
			updated = time.strftime(timeformat, time.strptime(md.Meta["updated"][0], "%d-%m-%Y")) if "updated" in md.Meta else created

			# index the page

			# get current corpus size
			id_num = search_index["corpusSize"]
			# increment corpus size
			search_index["corpusSize"] += 1

			# get important text
			raw = content
			if "authors" in md.Meta:
				raw += " " + " ".join(md.Meta["authors"])
			if "keywords" in md.Meta:
				raw += " " + " ".join(md.Meta["keywords"])
			raw += " " + created + " " + updated
			# remove metadata
			raw = metare.sub("", raw)
			# normalize
			raw = unicodedata.normalize("NFD", raw)
			# lowercase
			raw = raw.lower()
			# expand contractions
			for regex, repl in contractions:
				raw = regex.sub(repl, raw)
			# split into tokens
			tokens = punctuation.split(raw)
			# doc length
			length = len(tokens)

			total_length += length
			search_index["docs"][id_num] = [ident, length]

			# lets create temporary mapping for terms
			words = dict()

			# count words and their frequencies
			for tok in tokens:
				# strip whitespace
				tok = tok.strip()
				# token is a stopword or empty string
				if tok in stopwords or not tok:
					continue
				# new item for search suggestions
				if tok not in search_suggestions:
					search_suggestions.append(tok)
				# get the word stem
				tok = stemmer.stem(tok, 0, len(tok) - 1)
				# count frequency of word in document
				words[tok] = words.get(tok, 0) + 1

			# move counted words to the index
			for tok, freq in words.items():
				if tok not in search_index["terms"]:
					search_index["terms"][tok] = []
				search_index["terms"][tok].append([id_num, freq])

			# pass this to templates
			doc = {
				"identifier": ident,
				"title": md.Meta.get("title", ["Untitled"])[0],
				"about": " ".join(md.Meta.get("about", ["No description"])),
				"prev": md.Meta.get("prev", [None])[0],
				"next": md.Meta.get("next", [None])[0],
				"authors": authors,
				"keywords": keywords,
				"location": dstr[:-5],
				"contents": remap_toc(md.toc_tokens),
				"canonical": "https://%s/%s" % (domain, dstr),
				"created": created,
				"updated": updated,
				"folder": dest.stem == "index",
			}

			data_index[ident] = doc

			# set this page on sitemap
			sitemap.append({
				"location": doc["canonical"],
				"lastmod": time.strftime("%Y-%m-%dT%H:%M:%S+00:00",
					time.gmtime(0) if updated == "Unknown" else time.strptime(updated, timeformat))
			})

			# for seo
			seo = json.dumps({
				"@context": "https://schema.org",
				"@type": "WebSite" if doc["folder"] and len(dest.parents) == 1 else "WebPage",
				"description": doc["about"],
				"headline": doc["title"],
				"name":doc["title"],
				"url": doc["canonical"],
			}, separators=(",",":"))

			# template to use
			template = base_template

			try:
				template = env.get_template(str(relroot / file) + ".jinja2")
			except Exception:
				try:
					template = env.get_template(relroot / "_template.jinja2")
				except Exception:
					# parent dirs
					for parent in relroot.parents[:-1]:
						try:
							template = env.get_template(parent / "_template.jinja2")
							break
						except Exception:
							pass


			# create html document
			with open(OUTPUT_FOLDER / dest, "w", encoding="utf-8") as f:
				f.write(template.render(
					loc=doc["location"],
					doc=doc,
                    parents=parenNav[:-1] if doc["folder"] else parenNav,
					toc=md.toc,
					content=html,
					seo=seo,
					meta=stringify(doc)
				))

	# create redirect pages
	print("creating redirects ...")

	for key, val in r_redirect.items():
		print("%s -> %s" % (key, val))

		path = os.path.join(OUTPUT_FOLDER, key)
		dirname = os.path.dirname(path)

		if not os.path.isdir(dirname):
			os.makedirs(dirname)

		with open(path, "w", encoding="utf-8") as f:
			f.write(redirect_template.render(
				link=os.path.relpath(val, start=key + "/..")
			))

	# create deleted pages
	print("creating deleted pages ...")

	for key in r_deletion:
		print("%s" % (key))

		path = os.path.join(OUTPUT_FOLDER, key)
		dirname = os.path.dirname(path)

		if not os.path.isdir(dirname):
			os.makedirs(dirname)

		with open(path, "w", encoding="utf-8") as f:
			f.write(deleted_pages_template.render(
				loc=key
			))

	# finalize and write index
	print("finalizing search index ...")
	search_index["avgdl"] = total_length / search_index["corpusSize"]
	with open(os.path.join(OUTPUT_FOLDER, "assets", "searchIndex.js"), "w", encoding="utf-8") as f:
		f.write("window.searchIndex=" + stringify(search_index) + ";\n")

	# save data index
	print("saving data index ...")
	with open(os.path.join(OUTPUT_FOLDER, "assets", "dataIndex.js"), "w", encoding="utf-8") as f:
		f.write("window.dataIndex=" + json.dumps(data_index, separators=(",", ":")) + ";\n")

	# create link index
	print("mapping docs id ...")
	with open(os.path.join(OUTPUT_FOLDER, "assets", "linkIndex.js"), "w", encoding="utf-8") as f:
		f.write("window.linkIndex=" + json.dumps(identifiers, separators=(",", ":")) + ";\n")

	# create search suggestions list
	print("creating search suggestions ...")
	with open(os.path.join(OUTPUT_FOLDER, "assets", "suggestions.js"), "w", encoding="utf-8") as f:
		f.write("window.searchSuggestions=" + json.dumps(search_suggestions, separators=(",", ":")) + ";\n")

	# create sitemap
	print("creating sitemap ...")
	with open(os.path.join(OUTPUT_FOLDER, "sitemap.xml"), "w", encoding= "utf-8") as f:
		f.write(sitemap_template.render(pages=sitemap))

	print("build done")

# create distribution package
if args.pack:
	import tarfile
	import zipfile
	import pathlib

	print("packing distributions ...")

	# make sure dist folder is there
	if not os.path.isdir(DIST_FOLDER):
		os.makedirs(DIST_FOLDER)

	# open archive streams
	tgzf = tarfile.open(os.path.join(DIST_FOLDER, "VYTDocs.tgz"), "w:gz")
	zipf = zipfile.ZipFile(os.path.join(DIST_FOLDER, "VYTDocs.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=9)

	# iterate over all files
	for root, dirs, files in os.walk(OUTPUT_FOLDER):
		relroot = pathlib.Path(root).relative_to(OUTPUT_FOLDER)
		# exclude .github
		if relroot.is_relative_to(".github"):
			continue
		for file in files:
			# process needed paths
			srcfile = os.path.join(root, file)
			arcname = relroot / file
			# write files
			tgzf.add(srcfile, arcname=arcname)
			zipf.write(srcfile, arcname)

	# flush and close (save) archive streams
	tgzf.close()
	zipf.close()

	print(f"pack done. saved at {DIST_FOLDER} folder")

# deploy to github pages
if args.deploy:
	try:
		from ghp_import import ghp_import
	except ImportError:
		exit("failed to load required dependencies for deployment")

	if input("are you sure you want to deploy this site? [y/n]: ").lower()[0] != "y":
		exit(0)

	# add last commit hash that had been deployed like MKDocs do so its easily
	# accessible
	import subprocess
	pipe = subprocess.Popen(["git", "rev-parse", "head"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	sha1 = pipe.communicate()[0].decode()
	pipe.kill()
	msg = "deploy: %s" % (sha1)

	print("deploying to GitHub Pages...")

	try:
		ghp_import(OUTPUT_FOLDER, mesg=msg, push=True, branch="site")
	except Exception:
		print("deployment failed")
