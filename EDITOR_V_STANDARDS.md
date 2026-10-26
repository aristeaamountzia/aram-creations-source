# Editor V standards

**Standards version 2.** Every compatibility report states the version it checked
against; if it does not match the number here, one of the two is older. This is a
specification an agent implements, not a style guide — Editor V depends on what it
asks you to emit, so a project that skips a rule is missing a capability, not a
nicety.

**Applies to both Next.js and Vite + React.** Editor V supports both, and every
rule below is about the shape of your JSX — class names, components, lists — which
is identical in each. The one framework-specific section is at the end.

Follow this and the project stays an ordinary Next.js or Vite + React codebase
that Editor V can also edit visually. Nothing here asks for a proprietary format,
a runtime dependency, or a build step. It asks for source that says plainly which
element owns which value.

Keep this file in the project root.

## Before you write anything: record this file

**If you are an AI coding agent, do this first.**

Add a pointer to this file in the memory document your tools read automatically,
so every future session finds it without being told:

- **`CLAUDE.md`** — read by Claude Code and the Claude apps
- **`AGENTS.md`** — read by Codex, Cursor, Antigravity and most others

Create the file if it does not exist. Add this near the top — the line itself,
not a summary of the rules below it:

> **Editor V project.** Read `EDITOR_V_STANDARDS.md` in the project root before
> writing or changing any component. It is a specification this project is built
> to, not a style guide — skipping a rule removes a capability from the visual
> editor. Run `npm run check` before you finish, and fix what it reports.

## Why these rules exist

Editor V edits real source. When you change something on the canvas it rewrites
the class list, the text, or the data behind it, and the file has to contain
something it can rewrite. The rules below all come from that one requirement.

Editor V can also check a project against these rules at any time — **File →
Check Compatibility…**, or before a project that has never been opened is opened
at all. And the same scan runs from inside the project, without the app:

```bash
npm run check
```

**Run it before you finish, and fix what it reports.** It prints each finding
with its file, line and the fix, exits non-zero on anything that would stop the
project opening, and `--strict` fails on any finding at all. The script lives in
`.ve/`, which Editor V installs the first time the project is opened; if
`npm run check` says the checker is missing, open the project in Editor V once.
Building to the standard means never needing the report.

**Not following a rule costs a capability where it applies; it does not shut the
project.** An element whose class list Editor V cannot rewrite is an element it
declines to style, on that element, with the reason — the rest of the project
edits normally. Only a project-level failure, meaning no supported framework or
no source files at all, stops a project opening, because nothing can be edited
without those. So the report is a list of what is out of reach and how to bring
it in, not a gate to get past.

## 1. Class names

Give **every element you render** a static class string of its own.

```tsx
<section className="hero flex flex-col items-center">
```

Not every element you intend to style — every element. Which elements someone
will want to change is not knowable while you are writing the component, and it
is not the author's call to make. An element with no literal class text of its
own is one Editor V can only report as code-only, however ordinary it looks.

A template literal is fine as long as its interpolations are **plain
identifiers** — a variable or a property access, nothing computed in place —
and the template is laid out so the editor can reach its static text. Three
rules, and the examples in this file all follow them:

```tsx
const tone = active ? "text-ink" : "text-muted"      // decide above
<p className={`text-lg leading-6 ${tone}`}>          // interpolate below
```

- **Plain identifiers only.** A conditional written *inside* the template
  (`${active ? "a" : "b"}`), a helper call (`clsx(…)`, `cn(…)`), or a
  className that is just a variable from somewhere else cannot be edited. In
  each case there is no literal class text in the file to rewrite, and
  rewriting it anyway would change states the editor cannot see.
- **Static text first.** Editor V rewrites the first chunk of a template and
  nothing after it, so the static classes go in front of the interpolation.

  ```tsx
  <article className={`feature-card ${className}`}>   // editable
  <article className={`${className} feature-card`}>   // not editable: nothing to reach
  ```

- **An interpolation is a whole class, never part of one.** A class name
  finished by a variable is half a class until runtime, and Editor V refuses
  the whole element rather than rewrite around it. Tailwind asks for the same
  thing for its own reason — it only generates CSS for class names it can find
  complete in the source.

  ```tsx
  <p className={`text-lg ${tone}`}>      // editable: tone is a whole class
  <p className={`text-${tone} p-2`}>     // refused: text- is not a class
  ```

  Decide the whole class above and interpolate the whole class:
  `const toneClass = tone === "warn" ? "text-amber-600" : "text-slate-600"`,
  then ``className={`p-2 ${toneClass}`}``.

**When the conditional is styling, put the state on a `data-` attribute and
keep the class list a static string.** Hoisting the conditional into a variable
satisfies the rule above, but the two states then live in a variable and
neither is editable. With the state on the element, every class is literal and
both states can be styled:

```tsx
<article data-expanded={expanded ? "true" : "false"} className="group">
  <span className="rotate-90 group-data-[expanded=true]:rotate-0" />
</article>
```

Hoisting is the fallback for a class that has to come from elsewhere; the
`data-` attribute is the answer when the difference between the states is a
matter of style.

This applies to **component call sites exactly as it does to DOM elements**.
`<Card className={itemClass} />` is measured the same way as
`<div className={itemClass} />`.

### Where the literal text has to sit

The text has to be in the element's own `className`. These four all look
finished and all leave an element with nothing to rewrite — they are the
mistakes that actually happen, in the order they tend to happen:

```tsx
<h3 className={item.titleClassName}>          // the class list moved into the data file
<img className={imageClassName} />            // the class list arrives as a prop
<div className={mediaClassName}>              // the literal is on the parameter's default, not the element
<button className={classes}>                  // the class list is right there, a few lines up
<li>                                          // no class at all; CSS reaches it as `.list li`
```

The fourth is the commonest of all, and the one that feels least like a mistake:

```tsx
const classes = `button button-large ${className}`.trim()   // literal, static, correct
if (!href) return <button className={classes}>…</button>    // and out of reach
return <a className={classes}>…</a>
```

Nothing about that class list is dynamic. It is simply not at the element, and
Editor V rewrites classes where they are written — so write it at each element,
repeating it rather than sharing one variable between them:

```tsx
<button className={`button button-large ${className}`.trim()}>
<a className={`button button-large ${className}`.trim()}>
```

The repetition is the point rather than the price. Two elements with their own
class lists are two things that can be styled separately; one variable feeding
both means an edit to either would have to change both, which is why following
the variable is not something Editor V does.

The last one is the easiest to miss, because the page looks right. Styling an
element through a descendant selector is fine CSS and no help at all to the
editor: it still needs a class on the element to rewrite. Give it one.

Each is fixed the same way — put a static base class on the element and append
the rest to it:

```tsx
<h3 className={`card-title ${item.titleClassName}`.trim()}>
<img className={`product-image ${imageClassName}`.trim()} />
<div className={`frame-media ${mediaClassName}`.trim()}>
<li className={`list-item ${item.itemClassName}`.trim()}>
```

**Every element needs a static class of its own.** If a component forwards a
class, the element it lands on still needs literal text beside it:

```tsx
<article className={`feature-card ${className}`}>   // good: an anchor plus the forwarded class
<article className={className}>                     // not editable: nothing of its own
```

That base class may exist only as an editing anchor and match no CSS rule. That
is expected, and it is why adding these is safe: a class no rule selects changes
nothing about how the page looks.

## 2. Reusable components

Any component used more than once accepts an optional `className` and appends
it to the element it returns.

```tsx
export function Muted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-muted ${className}`}>{children}</span>
}
```

This is what lets one instance be styled without touching the others: Editor V
identifies an instance by a marker class passed through `className`, so a
component that ignores it makes all of its instances indistinguishable in source.

Three further rules follow from it:

- **Forward it to the element you mean.** A class accepted and then dropped is
  worse than one never accepted — the editor reports the style as applied, the
  file changes, and the page does not.
- **Give nested targets their own prop.** A forwarded `className` reaches the
  root the component returns, not a descendant. If an inner element should be
  styleable, give it `titleClassName`, `mediaClassName`, or similar.
- **A nested target still needs its own base class.** The prop is the caller's
  half; the element keeps a static class beside it. Putting the shared classes
  on the parameter's default value does not count — the literal text ends up on
  the signature rather than on the element, and there is nothing at the element
  to rewrite.

```tsx
function ProductFrame({ mediaClassName = "" }) {          // default holds only the difference
  return <div className={`frame-media ${mediaClassName}`.trim()} />
}
```

## 3. Lists and repeated content

Anything rendered through `.map()` needs three things.

```tsx
const features = [
  { id: "canvas", title: "Live canvas", cardClassName: "", titleClassName: "" },
]

{features.map((feature) => (
  <article key={feature.id} className={`feature-card ${feature.cardClassName}`}>
    <h3 className={`feature-title ${feature.titleClassName}`}>{feature.title}</h3>
  </article>
))}
```

- **A stable id.** Never the array index, and never a value produced at render
  time. A key built from item fields — `` `${stage.number}-ribbon` `` — is
  stable, because the fields are.
- **Text from named fields**, so an edit has somewhere to be written.
- **A per-item class field**, so one card can differ from the rest. Without it,
  every card shares one class list and styling one styles all of them.

**And the array a `.map()` walks must be a literal the reader can see from the
call** — a named array, in this file or imported from one in the project. These
three have correct items and are still out of reach, because nothing at the map
site says what the list is:

```tsx
{[...SHARED, ...tier.extras].map(…)}   // a spread
{tier.items.map(…)}                    // a property of the item being mapped
{buildRows().map(…)}                   // built by a helper
```

A nested map is the one that bites: no line in a pricing list and no cell in a
comparison table can be styled on its own, which is the one thing a comparison
table wants. Flatten the nesting or write the repetition out — two pricing cards
as explicit markup, a table's three cells indexed rather than mapped. More
verbose, and the right trade for source that exists to be edited.

### Which elements get a field

Emit a per-item class field for the **card, and for each badge, button, image and
piece of text inside it** — the parts someone points at and says "not that one,
just this one". Not every wrapper: a field for every div, times eleven items, is a
data file full of empty strings that a person still has to read past to find the
content.

The name says which element it belongs to — `cardClassName`, `titleClassName`,
`imageClassName` — because that is how Editor V finds it: a field whose name
contains `ClassName` (or `style`). A field named any other way is not written
to, however it is used — `` `card ${item.look}` `` leaves the item without
per-item styling, and the scan says so. **The field the
element's own `className` interpolates is where its per-item styles are written**,
so a card reading `` `feature-card ${item.cardClassName}` `` gets its styles in
`cardClassName`, and the `<h3>` inside it gets its own in `titleClassName`. Skip
the field and that element's styling reaches every item instead of one.

**The field holds the difference, not the whole class list.** This is the rule
that gets inverted most often. The shared, CSS-bearing classes belong in the JSX
where they are literal text; the field starts empty and exists so one item can
diverge later.

```tsx
{ cardClassName: "feature-card feature-card-wide" }   // wrong: JSX left with nothing literal
{ cardClassName: "feature-card-wide" }                // right: JSX owns `feature-card`
```

A content file full of complete class lists reads like good separation and is
the opposite: it moves every class out of the file the editor rewrites and into
one it does not.

Destructuring in the callback — `items.map(({ tool, itemClassName }) => …)` —
owns its **text and style** exactly as the dotted form does: `key={tool}` and
`${itemClassName}` in the class list are followed the same way as
`key={item.tool}` and `${item.itemClassName}`. The naming rule is the same too —
a bare `${look}` in the class list is no more a class field than `item.look`.

**Where the array lives is not one of the three.** Editor V follows the import to
the file that declares the array — a relative path, a `paths` alias such as
`@/content/landing`, or a barrel that re-exports it — and writes the item there.
Keep the data where it reads best.

Two things it cannot follow, and the scan reports both rather than passing the
list silently: an array that arrives as a **prop**, and one **derived** from
another value (`items.filter(…)`) rather than written out. Give the mapped
element a literal array it can reach, under a name.

## 4. Responsive behaviour

Use one breakpoint convention across the project. Editor V writes Desktop as base
utilities, Tablet as `max-lg:`, and Mobile as `max-md:`, and reads the same
shapes back. Keep content shared across breakpoints separate from styles that vary
by breakpoint.

**Keep Tailwind's default breakpoints.** Editor V's Tablet and Desktop frames sit
on `md` at 768px and `lg` at 1024px, and every responsive class it writes or
narrows is computed against the defaults. Moving one — `--breakpoint-md: 900px`
in `@theme`, or `theme.screens` in a Tailwind 3 config — makes the frame show one
width while the class applies at another, and the scan reports it. A custom
width belongs in an arbitrary variant, `min-[900px]:`, which Editor V reads and
writes as-is; adding a breakpoint under a *new* name is fine.

**Style with Tailwind classes what you want edited visually.** Elements styled
through styled-components, Emotion, CSS modules and the like have their look
decided outside their `className`, so the Styles panel cannot change them. The
scan names each file that imports such a system. Their text, images and
structure stay editable.

**Size per breakpoint, in pixels — not with a CSS function.** The Inspector
reads a size as the pixel number the element currently computes to, and writes
a size as a pixel class for the breakpoint being edited. A `clamp()`, a
`calc()`, a viewport unit or a fraction renders perfectly and encodes a rule the
editor cannot see: the panel shows one number, and changing it **replaces the
whole value with that fixed size** — the responsive behaviour the value carried
is gone, silently, at every width.

```tsx
<h1 className="text-[clamp(42px,5vw,72px)]">                          // one edit flattens it to one size
<h1 className="text-[72px] max-lg:text-[54px] max-md:text-[42px]">   // editable at each frame
```

The same goes for `w-1/2`, `text-[2rem]` and `text-[5vw]`: each becomes a
fixed pixel value the first time it is edited. Write the per-breakpoint classes
instead; they render the same and stay editable.

## 5. Animation and third-party code

Keep editable text and classes on elements no library rewrites.

Libraries that split, clone, or restore markup — GSAP `SplitText`, ScrollSmoother,
Flip, typewriter effects, anything setting `innerHTML` — own that markup. An edit
placed inside can be written to source correctly and then wiped from the page when
the library restores its own copy. Animate a wrapper, and leave the text element
alone.

## 6. Tell the scanner what is not the website

Put a `.veignore` in the project root listing anything that is not the live site:
design playgrounds, archived routes, fixtures. One glob per line, `#` for
comments, gitignore-shaped.

```
# not part of the live site
src/app/lab/**
src/app/(archive)/**
**/*.stories.tsx
```

This matters more than it looks. On the first real migration through this tool, 30
of 49 blocking findings were in code that was not the website, and the agent paid
to fix all of them.

## 7. Framework notes

Editor V decides which framework a project is from its `package.json`: `next` for
Next.js, or `vite` together with `react`. Anything else is reported as
unsupported rather than guessed at, so a project whose dependencies live somewhere
unusual — a monorepo package, for instance — may need opening at the directory
where its own `package.json` sits.

### Next.js

**Server Components are as editable as Client Components.** The editor reads your
source, not the rendered output, and its source tagging is applied during the
development build, so a server-rendered element arrives on the canvas tagged and
selectable like any other. Nothing here asks you to make a component a Client
Component for the editor's benefit.

**Keep `"use client"` on the leaves that need it.** Interactive state — a menu
disclosure, a form's validation, a carousel — belongs in small client components,
while content sections stay on the server. This is ordinary good practice, and it
also gives the steadiest canvas: the less of the page that re-renders in the
browser, the fewer chances a stray effect or animation has to undo an applied edit
before you see it.

**Be deliberate with `dynamic(..., { ssr: false })`.** Anything loaded that way is
absent from the first render, so it appears on the canvas only once it has loaded,
and is not selectable until then. Use it where you need it; do not reach for it by
default.

App Router and Pages Router both work, as do route groups and nested layouts.

### Vite + React

Nothing extra. The editor finds the rendered root from the entry your `index.html`
points at — usually `src/main.tsx` — and everything above applies unchanged.

### Versions, and what a report can tell you

The number at the top of this file is the version Editor V's rules were written
against, and every compatibility report states the version it ran. Two things
follow. A report produced by a newer build than the document in your project root
may check something this copy does not mention — replace the file. And a rule
added in a later version does not retroactively make an older project wrong: it
means a capability that project does not have yet, which the report names.

The version changes when a rule changes **what a conforming project must
contain**, never for rewording.

### Not checked yet

This standard is deliberately stricter than the scan. Write to the standard, not
to what the scan happens to catch.

The scan does not currently verify server and client boundaries. It reads
breakpoints only from `@theme` CSS and `tailwind.config`, and recognises a
styling system only by its import. It also does not
flag every element that lacks a static class of its own: an element whose
`className` is only a mapped item's field — `className={item.titleClassName}` —
passes today, and is still code-only on the canvas. Nor does it read sizes: a
`clamp()` in a class is not reported, and is still flattened by the first edit.

The scan does check how a template is laid out — static text first, and the
first chunk ending at a whole class — since standards version 2, and reports
each shape with its own fix. It reads the first chunk only, because that is the
only chunk Editor V rewrites: a class glued to a *later* interpolation
(`` `p-2 ${a} text-${b}` ``) is not reported, and is still a class Tailwind will
not generate.

**Nor does it check the per-element fields above one by one.** It asks whether the
mapped JSX reads *any* per-item style field, not whether the title, the badge and
the button each have their own. A list can pass every rule and still leave the
title inside each card styleable only for all of them at once. Deciding which
elements deserve a field is a judgement about the design — which is why the
document asks and the scan does not guess.

A clean report is not a promise that every element is editable; it is a statement
about the rules that ran, and a report always lists them.

## Checklist before you call a page done

- Every element that renders has literal class text of its own — not only the
  ones you expect to style.
- No element is left classless because CSS reaches it through a descendant
  selector.
- No className is only a data field, only a prop, or only a parameter default.
- Content files hold per-item differences; shared classes stay in the JSX.
- Every component used twice accepts and appends `className`, and every nested
  target prop lands beside a base class.
- Every list item has a stable id, named text fields, and a class field for the
  card and for each badge, button, image and text inside it — each named after the
  element it belongs to, and interpolated into that element's own `className`.
- No conditional or helper call produces a className inline; a template puts its
  static text first and every interpolation is a whole class.
- Sizes that vary by width are per-breakpoint pixel classes, not `clamp()`,
  `calc()`, a viewport unit or a fraction.
- Every `.map()` walks a named literal array — not a spread, a property of the
  item being mapped, or a helper's result.
- Animated text lives on an element the animation does not rewrite.
- `.veignore` covers everything that is not the live site.

## Verifying a change was visually neutral

A build that succeeds proves nothing about appearance. Capture the rendered HTML
of every route, extract each element's class attribute, and diff before against
after with any newly added base classes filtered out. Anything visually neutral
produces no other difference. This is more reliable than screenshots and works
headlessly.
