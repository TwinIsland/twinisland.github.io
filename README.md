# Personal Site Template

A single-page personal website template (About / Publications / Projects / Misc / Blog tabs) that runs entirely as static files — perfect for GitHub Pages. All site content is driven by one JSON file; no build step required.

## Directory Layout

```
/
├── index.html                # Page shell (tabs, header, footer). Normally no need to touch.
├── style.css                 # All site styling.
├── 404.html                  # GitHub Pages 404 page.
├── CNAME                     # Custom domain (optional, delete if unused).
├── js/
│   ├── site.js               # Rendering logic + the profile mini-game. Template code.
│   └── markdown-it-katex-bridge.js
├── assets/                   # Template-owned "skin" resources (do NOT put your content here).
│   ├── fonts/poppins/
│   └── suica_chara.gif       # Maintenance-page image.
├── badge/                    # WebGL badge modules and shared renderer.
├── data/                     # ★ Everything you edit lives here.
│   ├── site-content.json     # ★ All site content in one place.
│   ├── site-content.schema.json  # JSON Schema for site-content.json (editor autocomplete).
│   └── images/               # Content images, grouped by topic.
│       ├── profile/          # Profile photo + mini-game "wasted" photo.
│       ├── birds/            # Bird gallery originals and WebP thumbnails.
│       ├── logos/            # Education/affiliation logos.
│       └── publications/     # Paper teasers and posters.
├── posts/                    # ★ Blog posts live at the root, one folder per post.
│   └── <post-slug>/
│       ├── cover.jpg
│       └── <Post Title>.md
└── projects/                 # ★ Runnable demos (self-contained folders with their own index.html).
    ├── badge-viewer/
    ├── octave/
    └── qsynth/
```

## How to Customize

1. **Edit `data/site-content.json`.** Every tab's content, your profile info, publications, gallery images, and blog index are all in this one file. All image/path values are *site-relative* (relative to the repo root), e.g. `data/images/profile/me.jpg`.
2. **Drop content files into `data/`.** Put photos in `data/images/<topic>/` and reference them in the JSON.
3. **Write posts in `posts/<post-slug>/`.** Add a `cover.jpg` and a Markdown file, then register the post in the `blog` section of `site-content.json` (its `markdown` path). Images referenced inside the Markdown are resolved relative to the Markdown file itself.
4. **Add projects under `projects/<project>/`.** Each folder is a self-contained static app; point `run_url` in `site-content.json` at its `index.html`.
5. **Maintenance mode:** set `"maintenance": true` in `site-content.json` to show the under-maintenance page.
6. **Search/replace the site identity:** the site name lives in `site-content.json`; the SEO/social tags (og:image etc.) live in `index.html`. Set `profile.badge.list` to site-relative modules in switch order and `profile.badge.default` to the initial module path from that list. When omitted, the first module is used. Each module exports `mount(canvas)` and may return a cleanup function. Set `profile.badge.width` to a positive number in CSS pixels. Each module sets its canvas aspect ratio and any corner rounding in `mount(canvas)`. A module path on its own still works. Omit `profile.badge` to hide the badge.

## Local Preview

Any static file server works, e.g.:

```bash
npx serve .
```

or with Python: `python -m http.server`. Then open `http://localhost:<port>`.

## Deploy to GitHub Pages

Push this folder to a repository named `<username>.github.io` (or enable Pages for any repo) and it is live. To use a custom domain, put it in `CNAME`.
