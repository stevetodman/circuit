---
name: shot-scraper
description: Visual verification and web scraping using shot-scraper (Playwright-based CLI). Use this skill whenever you need to see what HTML/CSS/React actually looks like in a browser, verify UI changes visually, capture screenshots for documentation, extract structured data from web pages, audit accessibility trees, or debug layout issues. Triggers on any frontend work where visual confirmation would catch problems — including generating HTML reports, building components, styling pages, creating email templates, or any task where "does this look right?" matters. Also use for web scraping, PDF generation from URLs, and accessibility audits.
---

# shot-scraper: Visual Verification for Agentic Coding

shot-scraper is a CLI tool built on Playwright that captures screenshots, extracts data, generates PDFs, and dumps accessibility trees from web pages and local HTML files. It gives you eyes on what you're building.

## Installation

```bash
uv run shot-scraper --version  # works immediately via uvx/uv run
```

No separate install step needed when using `uv run`. Playwright browsers are auto-installed on first use.

## Core Workflow: Build → Screenshot → Evaluate → Fix

This is the primary pattern. After generating or modifying any HTML/CSS/React:

### 1. Screenshot local HTML files directly

```bash
uv run shot-scraper path/to/file.html -w 1280 -h 800 -o screenshot.png
```

No server required for static HTML. For apps needing a dev server, start the server first, then screenshot `http://localhost:<port>`.

### 2. Screenshot a specific element

```bash
uv run shot-scraper path/to/file.html -s '.card-component' -p 20 -o component.png
```

`-s` takes any CSS selector. `-p` adds padding pixels around the element so it's not tightly cropped.

### 3. Evaluate the screenshot

View the screenshot image and check for:
- Layout issues (overflow, alignment, spacing)
- Missing or broken styles
- Responsive behavior at different widths
- Color contrast and readability
- Whether the output matches the user's intent

### 4. Fix and re-screenshot

Make corrections, take another screenshot, and compare. Repeat until the output is correct.

## Common Options

| Flag | Purpose | Example |
|---|---|---|
| `-w` / `-h` | Viewport width/height | `-w 375 -h 667` (mobile) |
| `-s` | CSS selector to capture | `-s '#header'` |
| `-p` | Padding around selector (px) | `-p 20` |
| `--retina` | 2x pixel density | `--retina` |
| `--quality` | JPEG quality (0-100) | `--quality 80` |
| `--omit-background` | Transparent PNG background | `--omit-background` |
| `-j` / `--javascript` | Execute JS before capture | `-j "document.querySelector('.modal').click()"` |
| `-b` | Browser engine | `-b firefox` |

## Responsive Testing

Check multiple breakpoints by varying width:

```bash
# Mobile
uv run shot-scraper file.html -w 375 -h 667 -o mobile.png
# Tablet
uv run shot-scraper file.html -w 768 -h 1024 -o tablet.png
# Desktop
uv run shot-scraper file.html -w 1440 -h 900 -o desktop.png
```

## JavaScript Injection

Manipulate the page before capturing — trigger interactions, hide elements, change state:

```bash
uv run shot-scraper file.html -w 800 -h 600 \
  -j "document.querySelector('.loading-spinner').style.display = 'none';" \
  -o after-load.png
```

This is essential for capturing specific UI states (modals open, tabs selected, menus expanded, dark mode toggled).

## Accessibility Auditing

Dump the browser's accessibility tree as JSON:

```bash
uv run shot-scraper accessibility file.html
```

Returns structured data showing how assistive technologies perceive the page. Use this to verify:
- Heading hierarchy is correct
- Interactive elements have accessible names
- ARIA roles and labels are present
- Reading order makes sense

## Structured Data Extraction

Extract data from any rendered page as JSON:

```bash
uv run shot-scraper javascript https://example.com/ "({
  title: document.title,
  headings: Array.from(document.querySelectorAll('h1,h2,h3'), el => ({
    level: el.tagName,
    text: el.innerText
  }))
})"
```

## PDF Generation

```bash
uv run shot-scraper pdf file.html -o output.pdf
uv run shot-scraper pdf file.html --landscape --format a4 --print-background -o output.pdf
```

## Batch Screenshots (Multi-Shot YAML)

For multiple screenshots in one browser session, create a YAML config:

```yaml
- output: mobile.png
  url: http://localhost:3000
  width: 375
  height: 667

- output: desktop.png
  url: http://localhost:3000
  width: 1440
  height: 900

- output: component.png
  url: http://localhost:3000
  selector: ".hero-section"
  padding: 20
```

Run with:

```bash
uv run shot-scraper multi shots.yml
```

The YAML format also supports `server:` (start a local process) and `sh:` (run shell commands between shots).

## When to Screenshot

Take screenshots proactively during these tasks:
- **After generating any HTML/CSS** — verify it looks right before presenting to user
- **After CSS changes** — catch regressions in layout, spacing, colors
- **Before declaring "done"** — final visual check on the deliverable
- **Multiple viewport sizes** — if responsive behavior matters

Don't screenshot when:
- The task is purely logic/backend with no visual component
- You're just reading/parsing HTML without modifying appearance
- The user explicitly says they don't need visual verification
