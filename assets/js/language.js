/* ================================================================
Language data for the search engine

This uses code from:

  - https://github.com/axa-group/nlp.js
  - https://www.tartarus.org/~martin/PorterStemmer

Thank you NLP and Porter Stemmer!
================================================================ */

var languageData = (function() {
	var // language data
		langEn = {},
		// used in normalization
		codePoints = /[\u0300-\u036f]/g,
		// canonical decomposition
		form = "NFD",
		punctuations = /[\s~`’‘|^°{}[\]()<>\\%@#$&\-+=/*"':;!?.,]+/,
		// for quoted contractions
		replacements = [
			[/n't([ ,:;.!?]|$)/gi, ' not '],
			[/can't([ ,:;.!?]|$)/gi, 'can not '],
			[/'ll([ ,:;.!?]|$)/gi, ' will '],
			[/'s([ ,:;.!?]|$)/gi, ' is '],
			[/'re([ ,:;.!?]|$)/gi, ' are '],
			[/'ve([ ,:;.!?]|$)/gi, ' have '],
			[/'m([ ,:;.!?]|$)/gi, ' am '],
			[/'d([ ,:;.!?]|$)/gi, ' had ']
		],
		// for unquoted contractions
		contractionsBase = {
			cannot: ['can', 'not'],
			gonna: ['going', 'to'],
			wanna: ['want', 'to']
		};

	// collection of english stopwords
	langEn.stopwords = ["about", "above", "after", "again", "all", "also", "am", "an", "and",
		"another", "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
		"between", "both", "but", "by", "came", "can", "cannot", "come", "could", "did", "do",
		"does", "doing", "during", "each", "few", "for", "from", "further", "get", "got", "has",
		"had", "he", "have", "her", "here", "him", "himself", "his", "how", "if", "in", "into",
		"is", "it", "its", "itself", "like", "make", "many", "me", "might", "more", "most", "much",
		"must", "my", "myself", "never", "now", "of", "on", "only", "or", "other", "our", "ours",
		"ourselves", "out", "over", "own", "said", "same", "see", "should", "since", "so", "some",
		"still", "such", "take", "than", "that", "the", "their", "theirs", "them", "themselves",
		"then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
		"up", "very", "was", "way", "we", "well", "were", "what", "where", "when", "which", "while",
		"who", "whom", "with", "would", "why", "you", "your", "yours", "yourself", "a", "b", "c",
		"d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v",
		"w", "x", "y", "z", "_"
	];

	// normalizes a string
	langEn.normalize = function(s) {
		return s.normalize(form).replace(codePoints, "")
	}

	// tokenizes a string
	langEn.tokenize = function(s) {
		s = s.toLowerCase();
		var idx, punctSplit, word, raw = [], finalVals = [];

		// expand single quoted word
		for (idx = 0; idx < replacements.length; idx++) {
			s = s.replace(replacements[idx][0], replacements[idx][1]);
		}

		// extract by punctuations
		punctSplit = s.split(punctuations);

		// expand contracted words
		for (idx = 0; idx < punctSplit.length; idx++) {
			word = punctSplit[idx];
			if (contractionsBase[word]) {
				Array.prototype.push.apply(raw, contractionsBase[word]);
			}
			else raw.push(punctSplit[idx]);
		};

		// filter empty entries
		for (idx = 0; idx < raw.length; idx++) {
			if (raw[idx].length) finalVals.push(raw[idx]);
		}

		return finalVals;
	}

	// extract terms in the provided string
	langEn.split = function(s) {
		return langEn.tokenize(langEn.normalize(s));
	}

	// returns true if s is a stopword
	langEn.stop = function(s) {
		return langEn.stopwords.includes(s);
	}

	// Porter Stemmer
	// Modified to fasten itself
	var step2list = {
		"ational": "ate",
		"tional": "tion",
		"enci": "ence",
		"anci": "ance",
		"izer": "ize",
		"bli": "ble",
		"alli": "al",
		"entli": "ent",
		"eli": "e",
		"ousli": "ous",
		"ization": "ize",
		"ation": "ate",
		"ator": "ate",
		"alism": "al",
		"iveness": "ive",
		"fulness": "ful",
		"ousness": "ous",
		"aliti": "al",
		"iviti": "ive",
		"biliti": "ble",
		"logi": "log"
	},
	step3list = {
		"icate": "ic",
		"ative": "",
		"alize": "al",
		"iciti": "ic",
		"ical": "ic",
		"ful": "",
		"ness": ""
	},
	c = "[^aeiou]",
	// consonant
	v = "[aeiouy]",
	// vowel
	C = c + "[^aeiouy]*",
	// consonant sequence
	V = v + "[aeiou]*",
	// vowel sequence
	mgr0 = new RegExp("^(" + C + ")?" + V + C),
	// [C]VC... is m>0
	meq1 = new RegExp("^(" + C + ")?" + V + C + "(" + V + ")?$"),
	// [C]VC[V] is m=1
	mgr1 = new RegExp("^(" + C + ")?" + V + C + V + C),
	// [C]VCVC... is m>1
	s_v = new RegExp("^(" + C + ")?" + v),
	// vowel in stem
	// instantiate these regex once
	ra = /^(.+?)(ss|i)es$/,
	rb = /^(.+?)([^s])s$/,
	rc = /^(.+?)eed$/,
	rd = /^(.+?)(ed|ing)$/,
	re = /.$/,
	rf = /(at|bl|iz)$/,
	rg = new RegExp("([^aeiouylsz])\\1$"),
	rh = new RegExp("^" + C + v + "[^aeiouwxy]$"),
	ri = /^(.+?)y$/,
	rj = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/,
	rk = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/,
	rl = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/,
	rm = /^(.+?)(s|t)(ion)$/,
	rn = /^(.+?)e$/,
	ro = /ll$/;
	langEn.stem = function (w) {
		var stem,
		suffix,
		firstch,
		origword = w;
		if (w.length < 3) {
			return w;
		}
		firstch = w.substr(0, 1);
		if (firstch == "y") {
			w = firstch.toUpperCase() + w.substr(1);
		}
		// Step 1a
		if (ra.test(w)) {
			w = w.replace(ra, "$1$2");
		} else if (rb.test(w)) {
			w = w.replace(rb, "$1$2");
		}
		// Step 1b
		if (rc.test(w)) {
			var fp = rc.exec(w);
			if (mgr0.test(fp[1])) {
				w = w.replace(re, "");
			}
		} else if (rd.test(w)) {
			var fp = rd.exec(w);
			stem = fp[1];
			if (s_v.test(stem)) {
				w = stem;
				if (rf.test(w)) {
					w = w + "e";
				} else if (rg.test(w)) {
					w = w.replace(re, "");
				} else if (rh.test(w)) {
					w = w + "e";
				}
			}
		}
		// Step 1c
		if (ri.test(w)) {
			var fp = ri.exec(w);
			stem = fp[1];
			if (s_v.test(stem)) {
				w = stem + "i";
			}
		}
		// Step 2;
		if (rj.test(w)) {
			var fp = rj.exec(w);
			stem = fp[1];
			suffix = fp[2];
			if (mgr0.test(stem)) {
				w = stem + step2list[suffix];
			}
		}
		// Step 3
		if (rk.test(w)) {
			var fp = rk.exec(w);
			stem = fp[1];
			suffix = fp[2];
			if (mgr0.test(stem)) {
				w = stem + step3list[suffix];
			}
		}
		// Step 4
		if (rl.test(w)) {
			var fp = rl.exec(w);
			stem = fp[1];
			if (mgr1.test(stem)) {
				w = stem;
			}
		} else if (rm.test(w)) {
			var fp = rm.exec(w);
			stem = fp[1] + fp[2];
			if (mgr1.test(stem)) {
				w = stem;
			}
		}
		// Step 5
		if (rn.test(w)) {
			var fp = rn.exec(w);
			stem = fp[1];
			if (mgr1.test(stem) || (meq1.test(stem) && !(rh.test(stem)))) {
				w = stem;
			}
		}
		if (ro.test(w) && mgr1.test(w)) {
			w = w.replace(re, "");
		}
		// and turn initial Y back to y
		if (firstch == "y") {
			w = firstch.toLowerCase() + w.substr(1);
		}
		return w;
	};
	return langEn;
})();
