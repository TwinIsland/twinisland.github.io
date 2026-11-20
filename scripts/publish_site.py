"""Build the site and push dist/ to the root of origin's gh-pages branch."""

import argparse
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PAGES_REF = "refs/heads/gh-pages"


def git_output(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, encoding="utf-8").strip()


def publish():
    remote = git_output("remote", "get-url", "--push", "origin")
    name = git_output("config", "--get", "user.name")
    email = git_output("config", "--get", "user.email")
    if not all((DIST / file).is_file() for file in ("index.html", ".nojekyll")):
        raise SystemExit("The build must contain index.html and .nojekyll in dist/.")

    with TemporaryDirectory(prefix="site-publish-") as directory:
        git_dir = Path(directory) / "git"
        subprocess.run(
            ["git", "init", "--quiet", "--bare", "--initial-branch=gh-pages", str(git_dir)],
            check=True,
        )
        git = [
            "git", f"--git-dir={git_dir}", f"--work-tree={DIST}",
            "-c", "core.autocrlf=false", "-c", f"user.name={name}", "-c", f"user.email={email}",
        ]

        def run(*args, **options):
            return subprocess.run([*git, *args], cwd=DIST, check=True, **options)

        branch = run("ls-remote", "--heads", remote, PAGES_REF, capture_output=True).stdout
        if branch:
            run("fetch", "--quiet", remote, PAGES_REF)
            run("update-ref", PAGES_REF, "FETCH_HEAD")
        run("add", "--all", "--force", "--", ".")
        changes = run("diff", "--cached", "--name-status", capture_output=True).stdout.splitlines()
        if not changes or changes == [b"M\tbuild-info.html"]:
            print("gh-pages already has this build version.")
            return
        run("commit", "--quiet", "-m", "Publish website")
        run("push", remote, f"HEAD:{PAGES_REF}")
        commit = run("rev-parse", "--short", "HEAD", capture_output=True, text=True).stdout.strip()
        print(f"Published dist/ to origin/gh-pages at {commit}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--config", type=Path, metavar="FILE", help="use an alternate deployment JSON file")
    args = parser.parse_args()
    build = [sys.executable, str(ROOT / "scripts/build_site.py")]
    if args.config:
        build.extend(["--config", str(args.config.resolve())])
    try:
        subprocess.run(build, cwd=ROOT, check=True)
        publish()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.returncode) from error


if __name__ == "__main__":
    main()
