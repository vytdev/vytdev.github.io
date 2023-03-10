import argparse
import pathlib
import os
import shutil
import sys
import time
import functools
import json

parser = argparse.ArgumentParser(description="Your toolkit in docs development")
parser.add_argument("--clean", "-c", action="store_true", help="Whether to clean last output before doing any operations")
parser.add_argument("--watch", "-w", action="store_true", help="Watch for changes while editing source and resource files")
parser.add_argument("--deploy", "-d", action="store_true", help="Deploy changes directly to GitHub pages")
parser.add_argument("--compile", "-r", action="store_true", help="Re-build the site")
args = parser.parse_args()

out = "site"
src = "src"
res = "res"

try: import markdown
except ImportError: sys.exit("markdown module not installed. Did you setted-up your workspace dependencies?")

try: import jinja2
except ImportError: sys.exit("Jinja2 module not installed. Did you setted-up your workspace dependencies?")


os.chdir(os.path.dirname(__file__))

# filter for processing urls
@jinja2.pass_context
def url_filter(context, value):
	return str(pathlib.PosixPath(os.path.relpath(value, start=context["doc"]["loc"])))[3:]

# setup build environment
markdownExtensions = ["extra", "admonition", "toc", "meta", "sane_lists", "wikilinks", "codehilite"]
markdownConfigs = {
	"extra": {
		"footnotes": {
			"UNIQUE_IDS": True
		}
	},
	"toc": {
		"permalink": True,
		"permalink_title": "Permanent link to this reference."
	},
	"wikilinks": {
		"base_url": "/wiki/",
		"end_url": ".html"
	},
	"codehilite":{
		"css_class": "token"
	}
}
md = markdown.Markdown(extensions=markdownExtensions, extension_configs=markdownConfigs)
env = jinja2.Environment(loader=jinja2.FileSystemLoader(res), auto_reload=False)
env.filters["url"] = url_filter
tmpl = env.get_template("template.tmpl")

@functools.lru_cache(maxsize=None)
def buildPage(path):
	path = str(path)
	if not path.endswith(".md"): return
	floc = pathlib.Path(path).relative_to(src)
	loc = floc.parent
	fsub = loc / (floc.stem + ".html")
	fdest = out / fsub
	with open(path, "r", encoding="utf-8") as f:
		docBody = md.convert(f.read())
	loc = str(loc)
	ctx = {
		"about": md.Meta["description"][0] if "description" in md.Meta else "",
		"author": md.Meta["author"][0] if "author" in md.Meta else "",
		"title": md.Meta["title"][0] if "title" in md.Meta else "",
		"loc": str(fsub),
		"content": docBody,
		"category": loc.capitalize() if len(loc) != 0 and loc != "." else None,
		"home": floc.stem == "index",
		"toc": md.toc
	}
	with open(fdest, "w", encoding="utf-8") as f:
		f.write(tmpl.render(doc=ctx))
	# add to dex
	ctx["toc"] = md.toc_tokens
	md.reset()
	return ctx

@functools.lru_cache(maxsize=None)
def update():
	buildtime = time.strftime("%a, %d %b %Y %H:%M:%S %z", time.gmtime())
	filesnum = 0
	foldersnum = 0
	dex = {
		"files": {},
		"glosary": {},
		"date": buildtime
	}
	# perform cleanup
	if args.clean and os.path.exists(out): shutil.rmtree(out)
	if not os.path.exists(out): os.makedirs(out)
	# copy files in res folder one-by-one
	if args.clean:
		for root, dirs, files in os.walk(res):
			root = pathlib.Path(root)
			loc = pathlib.Path(root).relative_to(res)
			for folder in dirs:
				os.makedirs(out / loc / folder)
				foldersnum += 1
			for file in files:
				if file.endswith(".tmpl"):
					continue
				shutil.copyfile(root / file, out / loc / file)
				filesnum += 1
	# process source
	for root, dirs, files in os.walk(src):
		root = pathlib.Path(root)
		loc = root.relative_to(src)
		for folder in dirs:
			path = out / loc / folder
			if not os.path.exists(path):
				os.makedirs(path)
				foldersnum += 1
		for file in files:
			if not file.endswith(".md"): continue
			fpath = root / file
			fsub = loc / (file[:-2] + "html")
			ctx = buildPage(fpath)
			filesnum += 1
			try: del ctx["content"]
			except KeyError: pass
			dex["files"][str(fsub)] = ctx
	# create preset files
	with open(os.path.join(out, "dex.js"), "w", encoding="utf-8") as f:
		f.write("util.index={}".format(json.dumps(dex, separators=(",",":"))))
	# create build info
	with open(os.path.join(out, ".buildmeta"), "w", encoding="utf-8") as f:
		f.write(f"# This site is AUTO-GENERATED!!!  It should not be edited by hand.\n# Go to https://github.com/vytdev/vytdev.github.io to change the source files.\n\ndate={buildtime}\nfiles={filesnum}\nfolders={foldersnum}\n\n\n")

if args.clean and os.path.exists(out): shutil.rmtree(out)

if args.compile:
	update()
	if not args.watch: print("The site has been built on '{}'.".format(os.path.abspath(out)))

if args.watch:
	# initialy compile if not output folder not found
	if not os.path.exists(out): update()
	
	# import libraries
	try:
		from watchdog.events import FileSystemEventHandler
		from watchdog.observers import Observer
	except ImportError: sys.exit("watchdog module not installed. Did you setted-up your workspace dependencies?")
	
	import logging
	
	# apply basic config on logger, level to info
	logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s", datefmt='%Y-%m-%d %H:%M:%S')
	
	# custom event handler for processing changes
	class DocEventHandler(FileSystemEventHandler):
		def __init__(self, path, logger=None):
			self.path = path
			self.logger = logger or logging.root
		
		def update(self, path):
			if self.path == src:
				buildPage(path)
			elif self.path == res and not path.endswith(".tmpl"):
				destPath = out / pathlib.Path(path).relative_to(res)
				shutil.copyfile(path, destPath)
		
		def on_moved(self, ev):
			rel = out / pathlib.Path(ev.src_path).relative_to(self.path)
			if not ev.is_directory:
				fp = out / pathlib.Path(ev.src_path[:-2] + "html").relative_to(self.path)
				if os.path.exists(fp): os.unlink(fp)
				self.update(ev.dest_path)
			elif os.path.exists(rel):
				shutil.move(rel, out / pathlib.Path(ev.dest_path).relative_to(self.path))
			
			what = "directory" if ev.is_directory else "file"
			self.logger.info("Moved %s: from %s to %s", what, ev.src_path, ev.dest_path)
		
		def on_created(self, ev):
			dirpath = out / pathlib.Path(ev.src_path).relative_to(self.path)
			if not ev.is_directory:
				self.update(ev.src_path)
			elif not os.path.exists(dirpath):
				os.makedirs(dirpath)
			
			what = "directory" if ev.is_directory else "file"
			self.logger.info("Created %s: %s", what, ev.src_path)
		
		def on_modified(self, ev):
			if not ev.is_directory:
				self.update(ev.src_path)
			# no operations on directory
			
			what = "directory" if ev.is_directory else "file"
			self.logger.info("Modified %s: %s", what, ev.src_path)
		
		def on_deleted(self, ev):
			destPath = out / pathlib.Path(ev.src_path).relative_to(self.path)
			if ev.is_directory:
				if os.path.exists(destPath): shutil.rmtree(destPath)
			else:
				if self.path == src:
					os.unlink(destPath.parent / (destPath.stem + ".html"))
				else:
					os.unlink(destPath)
			
			what = "directory" if ev.is_directory else "file"
			self.logger.info("Deleted %s: %s", what, ev.src_path)
	
	# instantiate observers
	srcObserver = Observer()
	srcObserver.schedule(DocEventHandler(src), path=src, recursive=True)
	srcObserver.start()
	
	resObserver = Observer()
	resObserver.schedule(DocEventHandler(res), path=res, recursive=True)
	resObserver.start()
	
	# start watchmode
	print("Watch mode started. Press CTRL+C to escape.")
	try:
		while True:
			time.sleep(1)
	# stop on interruptions
	except:
		srcObserver.stop()
		resObserver.stop()
		print("\nWatch mode stopped...")
		update()
	srcObserver.join()
	resObserver.join()

if args.deploy and (args.compile or (not args.compile and not args.clean)):
	try: from ghp_import import ghp_import
	except: sys.exit("ghp-import module not installed. Did you setted-up your workspace dependencies?")
	ghp_import(out, push=True, branch="site")


