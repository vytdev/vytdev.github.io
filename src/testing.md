---
title: Testing Page
about: This page is for testing stuff
authors: [ vytdev ]
published: '2026-11-01'
updated: '2026-11-01'
---

# Testing Page

This page contains several sections, each of which demonstrates certain
feature sets the site generator of VYT Hub is capable of. You can hover
on the heading above for the first feature (heading anchors).

You can also notice the "trails" or "breadcrumbs" at top, just under the
navbar.

As you scroll, you can also see a back-to-top button appearing on the
bottom-right corner.

There will also be a toggleable sidebar button on the top left. The sidebar
would appear automatically on bigger screens. The table-of-contents there
is dynamic.

Future directions:

- [ ] Improve footnotes flexibility
- [ ] Reimplement the search engine (and refactor overall client JS)
- [ ] More flexible sidebars (and overall templating)
- [ ] Unify all configs
- [ ] Be easily reusable (i.e., remove hardcoded links like vytdev.github.io)



::: section Common
Common markdown features.

This is a **boldface** text.

This is an *italic* text.

This is both ***boldface and italic*** combined.

This is a __boldface__, but using underscores.

This is an _italic_, but using underscores.

This is both ___boldface and italic___, but using underscores.

Nested _italic __but with bold__ inside_.

Nested **bold *but with italic* inside**.

*Links*

[This is a link, it should not open another tab](./search.md).

[This is a link that should open another tab](https://github.com).

> [!NOTE]
> Use `./search.md` and not just `search.md` when referring to a page
> in the same directory. Without `./`, the `.md` won't be corrected.
>
> Type the protocol part (i.e., `http:`) when referring to an external
> link.

[This is a link using aliases, pointing to about page][alias-here]

[alias-here]: ./about.md

*Blockquotes*

> This is a blockquote.

*Images*

Proper image:
![You should not usually see this alt text](./assets/img/icon-24x24.png)

Missing image:
![You should see this alt text](./nonexistent/image.png)

With anchor:
[![icon](./assets/img/icon-32x32.png)](./index.md)
pointing to homepage.
:::





::: section Code
This is an `inline code`.

This is also an [`inline code` but inside a link](#)

And an [*`italic inline code`* within a link](#).

```text
This is a block code, with lang=text.
```

*Nested code fences*

````markdown
Nested demonstrating markdown.

```c
#include <stdio.h>

int main (void)
{
  printf("Hello, world!\n");
  return 1;
}
```

# Heading
````

*Highlighted C code*

```c
#include <stdio.h>

int main (void)
{
  printf("Hello, world!\n");
  return 1;
}
```

:::







::: section Lists

*Ordered list (starting from 3)*

3. this
4. is
5. a
6. numbered
7. list

*Unordered list*

- item A (`-`)
- item B
- item C

+ item D (`+`)
+ item E
+ item F

* item G (`*`)
* item H
* item I

*Deeply nested list*

1. Part 1
    - Part 2
        - Part 3
            1. Part 4
            2. Part 4
        - Part 3
        - Part 3
            - Part 4
    - Part 2
    - Part 2
        1. Part 3
        2. Part 3
    - Part 2
2. Part 1
3. Part 1
    1. Part 2

**this is a tasklist (an extra)**

- [ ] task list item 1
- [x] task list item 2, checked
- [ ] task list item 3, unchecked
- [x] ~~looks nice with strikethrough~~
:::





::: section Tables
| Column A | Column B | Column C | Column D |
| :- | :-: | -: | - |
| Left aligned | Center aligned | Right aligned | Unspecified |
| Left aligned | Center aligned | Right aligned | Unspecified |
| Left aligned | Center aligned | Right aligned | Unspecified |
| Left aligned | Center aligned | Right aligned | Unspecified |
| Left aligned | Center aligned | Right aligned | Unspecified |

Here is long table:

|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|
|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|
|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|
|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|

:::





::: section Inline Extras

Highlighted ==inline== text. [==Within a link==](#)

H~2~O

A ^superscript\ text^ and a ~subscript\ text~. (note: escape spaces with `\`)

This is a ~~strikethrough~~.

*Emojis*

- :rocket: &mdash; `:rocket:`
- :heart: &mdash; `:heart:`
- :smile: &mdash; `:smile:`

*Inline maths*

This, $x^2$, is inline math. There is also block math.

*Footnotes*

This is a footnote[^1], and another [^2]. Text labeled [^text].

Another reference to footnote 1 [^1].
:::




:::: section Block Extras

*Spoilers*

::: spoiler Initially *closed* spoiler!
this is a spoiler!
> [!TIP]
> Inlines work in spoiler and section titles
:::

::: spoiler-opened Initially *open* spoiler!
Content here.
:::

*Callouts*

> [!IMPORTANT]
> This is a callout.

> [!ATTENTION] Other *title* here
> I can also change the title.
> Inlines don't work on callout titles.

*LaTeX Maths*

The following is a block math.

$$
\int^\infty_1 \frac{1}{x} \, dx = \infty
$$

$$
\int^\beta_\alpha f(x) \, dx = F(\beta) - F(\alpha)
$$

$$
\lim_{x \to \infty} \left( 1 + \frac{1}{x} \right)^x = e
$$

*Definition lists:*

Info
: Definition

  More info
  - List here

: Another def

Term 2
: Definition for term 2.

`console.`_**`log`**_**`(`**_`obj`_**`)`**
: Log to console.

*The following should not work*

Term C ~ a
::::




::: section Callouts
> [!TIP]
> Content text

> [!ATTENTION]
> Content text

> [!DANGER]
> Content text

> [!ERROR]
> Content text

> [!HINT]
> Content text

> [!IMPORTANT]
> Content text

> [!NOTE]
> Content text

> [!WARNING]
> Content text

> [!CAUTION]
> Content text

> [!OTHER]
> Unknown type
:::


---

Footnotes (todo: improve this part)

[^1]: this is some infklo
[^2]: another footnote
[^text]: text label
