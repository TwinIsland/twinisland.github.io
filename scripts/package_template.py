"""Package the reusable site source without including this site's content."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


TEMPLATE_ZIP = "site-template.zip"
TEMPLATE_SOURCE = Path("templates/site")
FRAMEWORK_FILES = """
.gitignore
404.html
README.md
deploy.config.schema.json
index.html
style.css
assets/fonts/poppins/OFL.txt
assets/fonts/poppins/Poppins-Bold.woff2
assets/fonts/poppins/Poppins-Regular.woff2
assets/fonts/silkscreen/OFL.txt
assets/fonts/silkscreen/Silkscreen-Regular.woff2
assets/fonts/barlow-semi-condensed/BarlowSemiCondensed-Bold.woff2
assets/fonts/barlow-semi-condensed/BarlowSemiCondensed-Regular.woff2
assets/fonts/barlow-semi-condensed/OFL.txt
assets/icons/github.svg
assets/icons/mail.svg
assets/icons/orcid.svg
assets/icons/lucide/LICENSE
assets/icons/lucide/arrow-left.svg
assets/icons/lucide/arrow-up-right.svg
assets/icons/lucide/arrow-up.svg
assets/icons/lucide/chevron-left.svg
assets/icons/lucide/chevron-right.svg
assets/icons/lucide/file-archive.svg
assets/icons/lucide/heart.svg
assets/icons/lucide/moon.svg
assets/icons/lucide/refresh-cw.svg
assets/icons/lucide/sun.svg
assets/world-map.svg
badge/gyroid/index.js
badge/prism-knot/index.js
badge/schwarz-d/index.js
badge/soap-film/index.js
badge/webgl.js
css/travel-map.css
data/site-content.schema.json
js/blog-markdown.js
js/markdown-it-katex-bridge.js
js/site.js
js/theme.js
js/travel-map.js
scripts/build_site.py
scripts/package_template.py
scripts/publish_site.py
scripts/render_posts.cjs
themes/yuru.css
themes/werk.css
themes/pixel.css
""".split()


def package_template(root, stage, formatted):
    archive = stage / TEMPLATE_ZIP
    files = {Path(name): Path(name) for name in FRAMEWORK_FILES}
    for path in (root / TEMPLATE_SOURCE).rglob("*"):
        if path.is_file():
            source = path.relative_to(root)
            files[source] = source
            files[source.relative_to(TEMPLATE_SOURCE)] = source

    with ZipFile(archive, "w") as bundle:
        for destination, source in sorted(files.items(), key=lambda entry: entry[0].as_posix()):
            content = formatted.get(source)
            if content is None:
                content = (root / source).read_bytes()
            # Stable timestamps keep downloads and build versions reproducible.
            info = ZipInfo(destination.as_posix())
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, content, compress_type=ZIP_DEFLATED, compresslevel=9)
    return archive
