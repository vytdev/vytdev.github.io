"""
Script to remap gemoji db/emoji.json for faster retrieval of emojis
"""

import os
import json

print("loading emoji.json ...")

# read original db
with open("emoji.json", "r", encoding="utf-8") as src:
	orig = json.load(src)

output = dict()

print("remapping ...")

# remap here
for item in orig:
	for alias in item["aliases"]:

		# note if duplicate
		if alias in output:
			print("duplicate alias found: %s", alias)
			continue

		output[alias] = item["emoji"]

print("writing ...")

# write output
with open("remapped.json", "w", encoding="utf-8") as dest:
	json.dump(output, dest, indent="\t")

print("done")
