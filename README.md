# Personal Site Template

A static personal website for your profile, publications, projects, and blog.

If you downloaded the template ZIP, extract it and run `git init` from the extracted folder before building. The example content and SVG placeholders are ready to preview.

## Make it yours

1. **Replace the sample content** in [`data/site-content.json`](data/site-content.json).
2. **Add your images** under `data/images/` and use paths relative to the site root in the JSON, such as `data/images/profile/me.jpg`.
4. **Set up your domain.** Remove [`CNAME`](CNAME) if you plan to use the default GitHub Pages URL. For a custom domain, update the file and set the domain under **Settings → Pages → Custom domain**.

To add a blog post, put its files in `posts/<slug>/` and add an entry to `blog.content` with either a `markdown` or an `html` path. For HTML, write a trusted body fragment such as `<h2>Introduction</h2><p>...</p>`. Use URLs relative to the article for images and links.

To add a runnable demo, put it in `projects/<slug>/` and point the project's `run_url` at its entry page.

## Preview locally

From the repository root, run `python -m http.server 8000` and open [localhost:8000](http://localhost:8000/).
After building, open [localhost:8000/dist/](http://localhost:8000/dist/) to preview the published version.

## Deploy to GitHub Pages

1. **Build and publish** from the repository root. You need Python 3.10+, Node.js, Git, and internet access.

   ```sh
   python scripts/publish_site.py
   ```

   This builds `dist/` and pushes its contents to the root of `gh-pages`. Use `python scripts/build_site.py` to build locally. Both scripts read [`deploy.config.json`](deploy.config.json) from the repository root and accept `--config path/to/deploy.json` for another settings file.

   Set build options in that JSON file:

   - Set `runtime_markdown` to `true` to render Markdown in the browser, or `false` to generate HTML during the build.
   - Set `compress_images` to `true` and choose an `image_max_size` such as `"512KiB"`.
   - Set `watermark` to a transparent PNG path, or `null` to disable it. Add site-relative globs to `watermark_include` to choose the images, and set `watermark_opacity` between `0` and `1`.
   - Set `format_source` to `true` to write formatting changes back to the source files. Use `format_exclude` to skip formatting and minification for generated or standalone assets.
   - Set `workers` to the number of images to process at once. The default is `1`.

   Compression and watermarking require FFmpeg and apply to JPEG, PNG, WebP, and GIF copies in `dist/`.

2. **Set up Pages once.** In **Settings → Pages**, set the publishing source to `gh-pages` → `/ (root)`. [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

After editing your site, rerun `python scripts/publish_site.py`. To preview a local build, run `python -m http.server 8000 --directory dist`.

The published footer links to a build information page with the version, time, duration, and a downloadable template ZIP.
