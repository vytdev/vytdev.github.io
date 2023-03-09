import argparse
import pathlib
import os
import shutil
import sys
import time
import json

parser = argparse.ArgumentParser(description="Your toolkit in docs development")
parser.add_argument("--clean", "-c", action="store_true", help="Whether to clean last output before doing any operations")
parser.add_argument("--watch", "-w", action="store_true", help="Watch for changes while editing source and resource files")
parser.add_argument("--deploy", "-d", action="store_true", help="Deploy changes directly to GitHub pages")
parser.add_argument("--pack", "-p", action="store_true", help="Only package whats already built")
parser.add_argument("--compile", "-r", action="store_true", help="Re-build the site")
args = parser.parse_args()

out = "site"
src = "src"
res = "res"


try: import markdown
except ImportError: sys.exit("markdown module not installed. Did you setted-up your workspace dependencies?")

try: import jinja2
except ImportError: sys.exit("Jinja2 module not installed. Did you setted-up your workspace dependencies?")

if args.watch:
	try: import watchdog
	except ImportError: sys.exit("watchdog module not installed. Did you setted-up your workspace dependencies?")


def url_filter(context, value):
	pass

# setup build environment
markdownExtensions = ["extra", "admonition", "toc", "meta", "sane_lists", "wikilink"]
markdownConfigs = {
	"extra": {
		"footnotes": {
			"UNIQUE_IDS": True,
			"PLACE_MARKER": ""
		}
	},
	"toc": {
		"permalink": True
	},
	"wikilink": {
		"base_url": "/wiki/",
		"end_url": ".html"
	}
}
md = markdown.Markdown(extensions=markdownExtensions, extension_configs=markdownConfigs)
env = jinja2.Environment(loader=jinja2.FileSystemLoader(res), auto_reload=False)
env.filters["url"] = url_filter
tmpl = env.get_template("template.tmpl")


def update():
	buildtime = time.strftime("%a, %d %b %Y %H:%M:%S %z", time.gmtime())
	files = 0
	folders = 0
	dex = {
		"files": {},
		"glosary": {},
		"date": buildtime
	}
	# perform cleanup
	if args.clean:
		shutil.rmtree(out)
		os.makedirs(out)
	# copy files in res folder one-by-one
	else:
		for root, dirs, files in os.walk(res):
			loc = pathlib.Path(root).relative_to(res)
			for folder in dirs:
				os.makedirs(out / loc / folder)
				folders += 1
			for file in files:
				if file.endswith(".tmpl"):
					continue
				shutil.copyfile(root / file, out / loc / file)
				files += 1
	# process source
	for root, dirs, files in os.walk(src):
		loc = pathlib.Path(root).relative_to(res)
		for folder in dirs:
			os.makedirs(out / loc / folder)
			folders += 1
		for file in files:
			if not file.endswith(".md"): continue
			fpath = root / file
			fname = file[:-2] + "html"
			fsub = loc / fname
			fdest = out / loc / fname
			files += 1
			with open(fpath, "r", encoding="utf-8") as f:
				docBody = md.convert(f.read())
			ctx = {
				"about": md.Meta["description"],
				"author": md.Meta["author"],
				"title": md.Meta["title"],
				"loc": fsub,
				"content": docBody,
				"category": loc if len(loc) != 0 else None,
				"home": False # TODO: Improve this
			}
			with open(fdest, "w", encoding="utf-8") as f:
				f.write(tmpl.render(doc=ctx))
			
			dex["files"][fsub] = ctx
	# create preset files
	with open(out / "dex.js", "w", encoding="utf-8") as f:
		f.write("util.index({})".format(json.dumps(dex, separators=(",",":"))))
	# create build info
	with open(out / ".buildmeta", "w", encoding="utf-8") as f:
		f.write(f"""
		# This site is AUTO-GENERATED!!!  It should not be edited by hand.
		# Go to https://github.com/vytdev/vytdev.github.io to change the source files.
		date={buildtime}
		files={files}
		folders={folders}
		""")

if not args.pack:
	if args.clean:
		shutil.rmtree(out)
	if args.compile or not args.clean and not args.watch:
		update()

if args.watch and not args.compile:
	try:
		while True:
			time.sleep(1)
	except KeyboardInterrupt:
		# operations on stopping the observers
		pass

if args.deploy and (args.compile or (not args.compile and not args.clean)):
	try: from ghp_import import ghp_import
	except: sys.exit("ghp-import module not installed. Did you setted-up your workspace dependencies?")
	ghp_import(out, push=True, branch="site")


