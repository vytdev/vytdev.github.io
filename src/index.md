---
title: Ur landing page.
authors: [ vytdev, G13-newton ]
published: '2025-03-29'
updated: '2025-04-16'
prev_page: 404.md
next_page: README.md
no_toc: true
---

[reload](?a=b)

[reload2](?a=c)

[link to there](./a/b/index.html)

:::: section Simple admonition tests

### lvl 3 heading

# Hello!
## Are you mad?
## No, definitely not!
## Seems like you are.
## Just don't mind me.
# Suppositions?
## I don't want to elaborate your underlying assumptions.
## Give me a good rationale.

::: hl tip Admonition Tip
This is a tip.
:::

::: hl warning
Without title.
Some link to [other doc](./file.md).
Link to [external doc](https://github.com/vytdev/README.md). plus
[other doc with hash](./file.md#123) and
[other doc with query](./file.md?ab=c).

[doc with both](./file.md?ab=c#123)

[doc with both, reversed](./file.md?ab=c#123)
:::

:::  hl
No class. Who wants to talk in pages? Page page, page page page!
:::

::: spoiler Closed spoiler
This is initially closed.
:::

::: spoiler-opened Open spoiler
This is initially open.
:::

::: hl tip Multiline \
titles?
Will this work?
:::

::::


::: section You might find some stuff here... A very long name stress test huahahah

- list
- list2

* star list


`inline_code`

```js
// Block fence code
const express = require('express');
const app = express();
app.listen(3000, () => {
  console.log('listening on port 3000');
});
// This is a long enough single line comment intended to fill up the entire code block div, to assess how good is it.
```

| Th1 | Th2 | Th3 | a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|
| :-- | :-: | --: | -|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
| abc | def | ghi | a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|
| jkl | mno | pqr | a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|

*[HTML]: Hypertext Markup Language.

H~2~O
n^2^
==marked==
some foonote[^1]

Title
: Definition

Title 2
: Definition 2

- [ ] Tasklist item 1
- [x] Tasklist item 2

The pythagorean theorem states that the square of the hypotenus is
equal to the square of the two other legs, in algebraic notatation,
$c^2 = a^2 + b^2$.

$$ \int_{0}^{1} x^2 \, dx = \frac{x^3}{3} + c $$

> nice maths!

:::

::: section More content! :cat:

## As per the heading \
   too?

HTML is a markup language.

:smile: emoji.

# More things here :smile:
## Headings?
## Doesn't get bored?
## Are you numb?
## No!!
## Hello, world!
# The list of domination
## I simply wanted...
## ...to overflow the...
## ...sidebar TOC.
## We need verifications
## ... whether it is alright.
## no exceptions
# And we're about to complete the task.
## The sidebar is about to overflow.
## What could happen?
## Will it clip?
## Or will the overflow be handled correctly?

:::

[^1]: This is a footnote.
