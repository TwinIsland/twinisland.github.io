"""Build dist/ without npm using a deployment JSON file."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal
from hashlib import sha256
from html import escape
from io import BytesIO
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import tarfile
from tempfile import TemporaryDirectory
from time import perf_counter, sleep
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PRETTIER_VERSION = "3.6.2"
ESBUILD_VERSION = "0.25.12"
SITE_FILES = {"index.html", "404.html", "style.css", "CNAME"}
SITE_DIRECTORIES = {"assets", "badge", "css", "data", "js", "posts", "projects"}
SITE_CONFIG = Path("data/site-content.json")
DEPLOY_CONFIG = ROOT / "deploy.config.json"
MARKDOWN_BRIDGE = Path("js/markdown-it-katex-bridge.js")
RUNTIME_MARKDOWN_BLOCK = re.compile(
    r"(?m)^([ \t]*)<!-- Runtime Markdown start -->\s*(.*?)\s*<!-- Runtime Markdown end -->\r?\n",
    re.DOTALL,
)
IMAGE_CODECS = {
    ".jpg": "mjpeg", ".jpeg": "mjpeg", ".png": "png", ".webp": "libwebp", ".gif": "gif",
}
FORMATTER = """
import prettier from './standalone.mjs';
import babel from './babel.mjs';
import estree from './estree.mjs';
import postcss from './postcss.mjs';
import html from './html.mjs';
import { readFileSync } from 'node:fs';

const parsers = { css: 'css', js: 'babel', html: 'html' };
const files = JSON.parse(readFileSync(0, 'utf8'));
const formatted = await Promise.all(files.map(async (file) =>
  prettier.format(readFileSync(file, 'utf8'), {
    parser: parsers[file.split('.').pop()],
    plugins: [babel, estree, postcss, html],
    singleQuote: true,
    trailingComma: 'es5',
    htmlWhitespaceSensitivity: 'strict',
    endOfLine: 'auto',
  })
));
process.stdout.write(JSON.stringify(formatted));
"""


def download(url):
    with urlopen(url, timeout=30) as response:
        return response.read()


def download_prettier(directory):
    bundles = ["standalone", "plugins/babel", "plugins/estree", "plugins/postcss", "plugins/html"]

    def fetch_bundle(bundle):
        url = f"https://cdn.jsdelivr.net/npm/prettier@{PRETTIER_VERSION}/{bundle}.mjs"
        (directory / f"{Path(bundle).name}.mjs").write_bytes(download(url))

    with ThreadPoolExecutor() as pool:
        list(pool.map(fetch_bundle, bundles))
    script = directory / "format.mjs"
    script.write_text(FORMATTER, encoding="utf-8")
    return script


def download_esbuild(directory):
    system = {"Windows": "win32", "Linux": "linux", "Darwin": "darwin"}.get(platform.system())
    arch = {"amd64": "x64", "x86_64": "x64", "arm64": "arm64", "aarch64": "arm64"}.get(
        platform.machine().lower()
    )
    if not system or not arch:
        raise SystemExit(f"Unsupported esbuild platform: {platform.system()} {platform.machine()}")
    package = f"{system}-{arch}"
    url = f"https://registry.npmjs.org/@esbuild/{package}/-/{package}-{ESBUILD_VERSION}.tgz"
    member = "package/esbuild.exe" if system == "win32" else "package/bin/esbuild"
    executable = directory / Path(member).name
    with tarfile.open(fileobj=BytesIO(download(url)), mode="r:gz") as archive:
        with archive.extractfile(member) as binary:
            executable.write_bytes(binary.read())
    executable.chmod(0o755)
    return executable


def site_files():
    listing = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
    )
    paths = {Path(os.fsdecode(path)) for path in listing.split(b"\0") if path}
    return sorted(
        path for path in paths
        if (path.as_posix() in SITE_FILES or path.parts[0] in SITE_DIRECTORIES)
        and (ROOT / path).is_file()
    )


def format_files(files, formatter):
    paths = json.dumps([path.as_posix() for path in files]).encode("utf-8")
    result = subprocess.run(
        ["node", str(formatter)], cwd=ROOT, input=paths, stdout=subprocess.PIPE, check=True
    )
    return dict(zip(files, map(str.encode, json.loads(result.stdout)), strict=True))


def render_homepage(index, config):
    site = config.get("site") or {}
    seo = site.get("seo") or {}
    profile = config.get("profile") or {}
    name = site.get("name") or "Personal Website"
    title = seo.get("title") or name
    description = seo.get("description")
    url = seo.get("url")
    image = seo.get("image")
    base = ""
    if url:
        parts = urlsplit(url)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise SystemExit("site.seo.url must be an absolute HTTP(S) URL")
        base = parts._replace(path=parts.path.rstrip("/") + "/", query="", fragment="").geturl()
    if image:
        image = urljoin(base, image)
        parts = urlsplit(image)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise SystemExit("site.seo.image needs an absolute HTTP(S) URL or a site.seo.url")

    metadata = []
    for attribute, key, value in [
        ("name", "description", description),
        ("name", "robots", seo.get("robots")),
        ("property", "og:type", "website"),
        ("property", "og:url", url),
        ("property", "og:site_name", name),
        ("property", "og:title", title),
        ("property", "og:description", description),
        ("property", "og:image", image),
        ("name", "twitter:card", "summary_large_image" if image else "summary"),
        ("name", "twitter:title", title),
        ("name", "twitter:description", description),
        ("name", "twitter:image", image),
    ]:
        if value:
            metadata.append(f'<meta {attribute}="{key}" content="{escape(value)}" />')
    if url:
        metadata.append(f'<link rel="canonical" href="{escape(url)}" />')
    favicon = (site.get("favicon") or "").strip()
    if favicon:
        if urlsplit(favicon).scheme not in {"", "http", "https"}:
            raise SystemExit("site.favicon must be a site-relative or HTTP(S) URL")
        metadata.append(f'<link rel="icon" href="{escape(favicon)}" />')

    if url:
        website = {"@type": "WebSite", "@id": f"{url}#website", "url": url, "name": name}
        person = {
            "@type": "Person", "@id": f"{url}#person", "url": url,
            "name": profile.get("name") or name, "mainEntityOfPage": url,
        }
        if seo.get("alternate_names"):
            website["alternateName"] = person["alternateName"] = seo["alternate_names"]
        if image:
            person["image"] = image
        if profile.get("role"):
            person["jobTitle"] = profile["role"]
        if profile.get("school"):
            person["affiliation"] = {"@type": "CollegeOrUniversity", "name": profile["school"]}
        if seo.get("same_as"):
            person["sameAs"] = seo["same_as"]
        structured = json.dumps(
            {"@context": "https://schema.org", "@graph": [website, person]}, ensure_ascii=False
        ).replace("<", "\\u003c")
        metadata.append(f'<script type="application/ld+json">{structured}</script>')

    homepage = index.read_bytes().decode("utf-8")
    newline = "\r\n" if "\r\n" in homepage else "\n"
    source_url = (site.get("source_url") or "").strip()
    if source_url:
        parts = urlsplit(source_url)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise SystemExit("site.source_url must be an absolute HTTP(S) URL")
    placeholders = dict([
        ('<html lang="en">', f'<html lang="{escape(site.get("language") or "en")}">'),
        ("<title>Personal Website</title>", f"<title>{escape(title)}</title>"),
        ("<!-- Site metadata -->", (newline + "    ").join(metadata)),
        ("<!-- Site name -->Personal Website", escape(name)),
    ])
    source_pattern = r"hidden\s+data-site-source\b"
    pattern = re.compile("|".join([*map(re.escape, placeholders), source_pattern]))
    matches = {match[0] for match in pattern.finditer(homepage)}
    if not placeholders.keys() <= matches or not any(re.fullmatch(source_pattern, match) for match in matches):
        raise SystemExit("Missing homepage template placeholders in index.html")
    source_link = f'href="{escape(source_url)}"' if source_url else "hidden data-site-source"
    homepage = pattern.sub(lambda match: placeholders.get(match[0], source_link), homepage)
    index.write_bytes(homepage.encode("utf-8"))


def prerender_posts(stage, work, config):
    index = stage / "index.html"
    homepage = index.read_bytes().decode("utf-8")
    block = RUNTIME_MARKDOWN_BLOCK.search(homepage)
    if not block:
        raise SystemExit("Missing runtime Markdown block in index.html")
    stylesheet = re.search(r"<link\b[^>]*>", block[2])
    script_urls = re.findall(r'<script\s+src="(https://[^"]+)"', block[2])
    if not stylesheet or len(script_urls) != 2:
        raise SystemExit("Expected a stylesheet and two CDN scripts in the runtime Markdown block")

    config_path = stage / SITE_CONFIG
    sources = {}
    for post in (config.get("blog") or {}).get("content", []):
        markdown = post.get("markdown", "").strip()
        html = post.get("html", "").strip()
        if bool(markdown) == bool(html):
            raise SystemExit(f"Provide either markdown or html for post {post.get('title')!r}")
        url = urlsplit(markdown or html)
        source = stage / unquote(url.path)
        if url.scheme or url.netloc or not source.resolve().is_relative_to(stage) or not source.is_file():
            raise SystemExit(f"Post file is missing or outside the build: {markdown or html}")
        if not markdown:
            continue
        output = source.with_name(f"{source.name}.html")
        if output.exists():
            raise SystemExit(f"Generated post would overwrite {output.relative_to(stage)}")
        sources[source] = output
        post["html"] = quote(output.relative_to(stage).as_posix())
        del post["markdown"]

    if sources:
        libraries = [work / "markdown-it.js", work / "katex.js"]
        with ThreadPoolExecutor() as pool:
            for path, content in zip(libraries, pool.map(download, script_urls), strict=True):
                path.write_bytes(content)
        result = subprocess.run(
            ["node", str(ROOT / "scripts/render_posts.cjs"), *map(str, libraries),
             str(ROOT / MARKDOWN_BRIDGE)],
            input=json.dumps(list(map(str, sources))).encode("utf-8"),
            stdout=subprocess.PIPE, check=True,
        )
        for output, html in zip(sources.values(), json.loads(result.stdout), strict=True):
            output.write_bytes(html.encode("utf-8"))
        config_path.write_bytes((json.dumps(config, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))

    # SSR formulas use the same KaTeX CSS and fonts, loaded only on articles that contain math.
    indent = block[1]
    newline = "\r\n" if "\r\n" in homepage else "\n"
    replacement = (
        f'{indent}<template id="blog-math-styles">{newline}'
        f'{indent}  {stylesheet[0]}{newline}{indent}</template>{newline}'
    )
    index.write_bytes((homepage[:block.start()] + replacement + homepage[block.end():]).encode("utf-8"))
    return len(sources)


def image_limit_bytes(value):
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)\s*(B|KB|KIB|MB|MIB)?", value.upper().strip())
    if not match:
        raise argparse.ArgumentTypeError("use a size such as 512KiB, 0.75MB, or 1000000")
    units = {"B": 1, "KB": 1000, "KIB": 1024, "MB": 1000 ** 2, "MIB": 1024 ** 2}
    size = int(Decimal(match[1]) * units[match[2] or "B"])
    if size < 1:
        raise argparse.ArgumentTypeError("image size limit must be at least one byte")
    return size


def compress_image(ffmpeg, source, output, limit, watermark=None, watermark_opacity=1):
    codec = IMAGE_CODECS[source.suffix.lower()]
    if codec == "png" and b"acTL" in source.read_bytes():
        raise SystemExit(f"Cannot process animated PNG with this build: {source.name}")
    if codec == "libwebp":
        with source.open("rb") as file:
            header = file.read(21)
        if len(header) == 21 and header[12:16] == b"VP8X" and header[20] & 2:
            raise SystemExit(f"Cannot process animated WebP with this build: {source.name}")

    gif_loop = -1
    if codec == "gif":
        extension = re.search(rb"NETSCAPE2\.0\x03\x01(..)", source.read_bytes(), re.DOTALL)
        if extension:
            gif_loop = int.from_bytes(extension[1], "little")

    for percent in (100, 80, 64, 50, 38, 25, 15, 8, 4, 2, 1, 0):
        scale = f"scale=max(1\\,trunc(iw*{percent}/100)):max(1\\,trunc(ih*{percent}/100)):flags=lanczos"
        filters = scale if percent != 100 else "null"
        if watermark:
            filters = (
                f"[0:v]{filters},split[base][photo];"
                "[1:v][photo]scale=w=max(1\\,trunc(rw*0.15)):h=-1,"
                f"format=rgba,colorchannelmixer=aa={watermark_opacity}[logo];"
                "[base][logo]overlay=x=max(0\\,W-w-W*0.03):y=max(0\\,H-h-H*0.03):format=auto"
            )
        if codec == "gif":
            filters += ",split[frames][palette];[palette]palettegen[colors];[frames][colors]paletteuse=dither=bayer"
            settings = [("-loop", str(gif_loop), "-fps_mode", "passthrough")]
        elif codec == "mjpeg":
            settings = [("-q:v", str(quality)) for quality in (3, 7, 12, 20)]
        elif codec == "libwebp":
            settings = [
                ("-compression_level", "4", "-quality", str(quality))
                for quality in (85, 70, 55, 35)
            ]
        else:
            settings = [("-compression_level", "9")]

        for options in settings:
            with output.open("wb") as file:
                result = subprocess.run(
                    [
                        ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
                        "-i", str(source), *(["-i", str(watermark)] if watermark else []),
                        "-map_metadata", "-1", "-an",
                        "-filter_complex" if codec == "gif" or watermark else "-vf", filters,
                        "-c:v", codec, *options,
                        *([] if codec == "gif" else ["-frames:v", "1"]),
                        "-f", "gif" if codec == "gif" else "image2pipe", "pipe:1",
                    ],
                    stdout=file,
                )
            if result.returncode:
                raise SystemExit(f"FFmpeg failed to encode {source.name}")
            size = output.stat().st_size
            if size > 0 and (limit is None or size <= limit):
                return
            if limit is None:
                raise SystemExit(f"FFmpeg produced an empty image for {source.name}")
    raise SystemExit(f"Could not compress {source.name} to {limit:,} bytes")


def process_images(stage, work, args):
    watermark_targets = {
        path for pattern in args.watermark_include for path in stage.glob(pattern)
        if path.is_file()
        and path.suffix.lower() in IMAGE_CODECS
        and (ROOT / path.relative_to(stage)).resolve() != args.watermark
    } if args.watermark else set()
    if args.watermark and not watermark_targets:
        raise SystemExit("No eligible images match watermark_include")

    def process_image(path):
        watermark = args.watermark if path in watermark_targets else None
        needs_compression = args.image_max_size and path.stat().st_size > args.image_max_size
        if not watermark and not needs_compression:
            return False, False
        output = work / "processed-images" / path.relative_to(stage)
        output.parent.mkdir(parents=True, exist_ok=True)
        compress_image(args.ffmpeg, path, output, args.image_max_size, watermark, args.watermark_opacity)
        output.replace(path)
        return bool(needs_compression), bool(watermark)

    images = [
        path for path in sorted(stage.rglob("*"))
        if path.suffix.lower() in IMAGE_CODECS and path.is_file()
    ]
    compressed = watermarked = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for did_compress, did_watermark in pool.map(process_image, images):
            compressed += did_compress
            watermarked += did_watermark
    if args.image_max_size:
        print(f"Image limit: {args.image_max_size:,} bytes. Compressed {compressed} oversized images.")
    if args.watermark:
        print(f"Watermarked {watermarked} images.")


def rename_build_directory(source, destination):
    for attempt in range(5):
        try:
            source.rename(destination)
            return
        except PermissionError:
            if os.name != "nt" or attempt == 4:
                raise
            sleep(0.2 * (attempt + 1))


def write_build_info(stage, started):
    index = stage / "index.html"
    homepage = index.read_bytes()
    preview = re.compile(rb"<p\b[^>]*\bdata-build-preview\b[^>]*>.*?</p>", re.DOTALL)
    if len(preview.findall(homepage)) != 1:
        raise SystemExit("Expected one build link placeholder in index.html")

    digest = sha256()
    outputs = sorted(path for path in stage.rglob("*") if path.is_file())
    for path in outputs:
        digest.update(path.relative_to(stage).as_posix().encode("utf-8") + b"\0")
        digest.update(sha256(path.read_bytes()).digest())
    link = '<p class="footer-build">Build: <a href="build-info.html">{version}</a></p>'
    digest.update(link.encode("utf-8"))

    details = """<!doctype html>
<html lang="en" class="build-info-page">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Build {version}</title>
    <script src="js/theme.js"></script>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <main class="build-info">
      <h1>Build information</h1>
      <dl>
        <dt>Version</dt>
        <dd><code>{version}</code></dd>
        <dt>Built at</dt>
        <dd><time datetime="{built_iso}">{built_at:%Y-%m-%d %H:%M:%S} UTC</time></dd>
        <dt>Build duration</dt>
        <dd>{duration:.2f} seconds</dd>
        <dt>Files published</dt>
        <dd>{file_count}</dd>
        <dt>Artifact SHA-256</dt>
        <dd><code>{full_version}</code></dd>
      </dl>
      <p><a href="./">Back to home</a></p>
    </main>
  </body>
</html>
"""
    digest.update(details.encode("utf-8"))
    full_version = digest.hexdigest()
    version = full_version[:12]
    index.write_bytes(preview.sub(link.format(version=version).encode("utf-8"), homepage))
    built_at = datetime.now(timezone.utc)
    (stage / "build-info.html").write_bytes(details.format(
        version=version,
        full_version=full_version,
        built_iso=built_at.isoformat(timespec="seconds"),
        built_at=built_at,
        duration=perf_counter() - started,
        file_count=len(outputs) + 1,
    ).encode("utf-8"))


def build(work, files, formatter, esbuild, args, started):
    format_excluded = {
        path.relative_to(ROOT) for pattern in args.format_exclude for path in ROOT.glob(pattern)
    }
    sources = [
        path for path in files
        if path.suffix in {".css", ".js", ".html"}
        and path not in format_excluded
        and not path.name.endswith((".min.css", ".min.js"))
    ]
    formatted = format_files(sources, formatter)
    stage = work / "site"
    count = original_bytes = minified_bytes = 0
    for path in files:
        if path == MARKDOWN_BRIDGE and not args.runtime_markdown:
            continue
        content = formatted[path] if path in formatted else (ROOT / path).read_bytes()
        if path in formatted and path.suffix in {".css", ".js"}:
            original_bytes += len(content)
            content = subprocess.run(
                [
                    str(esbuild), f"--loader={path.suffix[1:]}", "--minify",
                    f"--sourcefile={path.as_posix()}", "--charset=utf8",
                    "--legal-comments=inline", "--log-level=warning",
                ],
                input=content, stdout=subprocess.PIPE, check=True,
            ).stdout
            minified_bytes += len(content)
            count += 1
        target = stage / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    (stage / ".nojekyll").touch()
    config = json.loads((stage / SITE_CONFIG).read_text(encoding="utf-8"))
    render_homepage(stage / "index.html", config)
    if not args.runtime_markdown:
        rendered = prerender_posts(stage, work, config)
        print(f"Pre-rendered {rendered} Markdown posts.")
    if args.image_max_size or args.watermark:
        process_images(stage, work, args)
    write_build_info(stage, started)

    previous = work / "previous-dist"
    if DIST.resolve() != DIST or not DIST.is_dir() and DIST.exists():
        raise SystemExit("dist must be a directory inside the repository")
    if DIST.exists():
        rename_build_directory(DIST, previous)
    try:
        rename_build_directory(stage, DIST)
    except OSError:
        if previous.exists():
            rename_build_directory(previous, DIST)
        raise

    if args.format_source:
        changed = 0
        for path, content in formatted.items():
            source = ROOT / path
            if source.read_bytes() != content:
                source.write_bytes(content)
                changed += 1
        print(f"Formatted {changed} source files.")
    print(f"Built dist/ with {sum(path.is_file() for path in DIST.rglob('*'))} files.")
    print(f"Minified {count} CSS/JS files ({original_bytes:,} -> {minified_bytes:,} bytes).")


def deployment_options(parser, path):
    try:
        config = json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        parser.error(f"deploy config not found: {path}")
    except (OSError, ValueError) as error:
        parser.error(f"cannot read {path}: {error}")
    defaults = {
        "runtime_markdown": False,
        "format_source": False,
        "format_exclude": [],
        "workers": 1,
        "compress_images": False,
        "image_max_size": "1MiB",
        "watermark": None,
        "watermark_include": [],
        "watermark_opacity": 1,
    }
    if not isinstance(config, dict) or config.keys() - defaults.keys() - {"$schema"}:
        parser.error(f"unsupported settings in {path}")
    if "$schema" in config and not isinstance(config["$schema"], str):
        parser.error(f"$schema must be a string in {path}")
    config = defaults | config
    if type(config["workers"]) is not int or config["workers"] < 1:
        parser.error(f"workers must be a positive integer in {path}")
    for key in ("runtime_markdown", "format_source", "compress_images"):
        if not isinstance(config[key], bool):
            parser.error(f"{key} must be true or false in {path}")
    try:
        size = image_limit_bytes(str(config["image_max_size"]))
    except argparse.ArgumentTypeError as error:
        parser.error(f"invalid image_max_size in {path}: {error}")

    if config["watermark"] is not None and not isinstance(config["watermark"], str):
        parser.error(f"watermark must be a PNG path or null in {path}")
    watermark = (ROOT / config["watermark"]).resolve() if config["watermark"] else None
    if watermark and (watermark.suffix.lower() != ".png" or not watermark.is_file()):
        parser.error(f"watermark must point to an existing PNG: {watermark}")
    for key in ("format_exclude", "watermark_include"):
        patterns = config[key]
        if not isinstance(patterns, list) or any(
            not isinstance(pattern, str) or not pattern.strip()
            or Path(pattern).anchor or ".." in Path(pattern).parts
            for pattern in patterns
        ):
            parser.error(f"{key} must be a list of site-relative glob patterns")
    if watermark and not config["watermark_include"]:
        parser.error("set watermark_include to select images for the watermark")
    opacity = config["watermark_opacity"]
    if type(opacity) not in (int, float) or not 0 <= opacity <= 1:
        parser.error("watermark_opacity must be a number between 0 and 1")
    ffmpeg = None
    if config["compress_images"] or watermark:
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            parser.error("image compression and watermarking require ffmpeg on PATH")
    return argparse.Namespace(
        runtime_markdown=config["runtime_markdown"],
        format_source=config["format_source"],
        format_exclude=config["format_exclude"],
        workers=config["workers"],
        image_max_size=size if config["compress_images"] else None,
        watermark=watermark,
        watermark_include=config["watermark_include"],
        watermark_opacity=opacity,
        ffmpeg=ffmpeg,
    )


def main():
    started = perf_counter()
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--config", type=Path, default=DEPLOY_CONFIG, metavar="FILE",
                        help="deployment JSON file (default: deploy.config.json at the repository root)")
    options = deployment_options(parser, parser.parse_args().config)
    files = site_files()
    if Path("index.html") not in files:
        parser.error("index.html is missing")
    with TemporaryDirectory(prefix=".site-build-", dir=ROOT) as temp:
        work = Path(temp)
        with ThreadPoolExecutor() as pool:
            prettier = pool.submit(download_prettier, work)
            esbuild = pool.submit(download_esbuild, work)
            build(work, files, prettier.result(), esbuild.result(), options, started)


if __name__ == "__main__":
    main()
