#!/usr/bin/env python3
"""
SEO Audit Script — Scans web project HTML files for common SEO issues.

Checks:
  1. Meta description length (target: 50-160 chars)
  2. Keyword count (target: 3-8 focused phrases)
  3. Heading structure (H1 present, H2 present)
  4. OG/Twitter description length (target: <160 chars)
  5. Title tag length (target: 30-60 chars)
  6. Duplicate meta tags
  7. Missing canonical URL
  8. Missing OG image

Usage:
  python3 seo_audit.py <project_path> [--verbose] [--json]
  python3 seo_audit.py <project_path> --url <page_url>  # audit a live page via curl
"""

import sys
import os
import re
import json
import subprocess
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

@dataclass
class Finding:
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    message: str
    current_value: str
    target: str
    file: str
    line: int = 0
    fix: str = ""

@dataclass
class SEOReport:
    page: str
    findings: list = field(default_factory=list)
    meta_description: Optional[str] = None
    meta_description_length: int = 0
    og_description: Optional[str] = None
    og_description_length: int = 0
    twitter_description: Optional[str] = None
    twitter_description_length: int = 0
    title: Optional[str] = None
    title_length: int = 0
    keywords: list = field(default_factory=list)
    keyword_count: int = 0
    has_h1: bool = False
    has_h2: bool = False
    has_canonical: bool = False
    has_og_image: bool = False
    score: int = 100  # starts at 100, deducted per finding


def extract_meta(html: str, name: str) -> Optional[str]:
    """Extract content from <meta name="X" content="Y" />"""
    pattern = rf'<meta\s+name="{name}"\s+content="([^"]*)"'
    match = re.search(pattern, html, re.IGNORECASE)
    if match:
        return match.group(1)
    # Try reversed attribute order
    pattern2 = rf'<meta\s+content="([^"]*)"\s+name="{name}"'
    match2 = re.search(pattern2, html, re.IGNORECASE)
    return match2.group(1) if match2 else None


def extract_property(html: str, prop: str) -> Optional[str]:
    """Extract content from <meta property="X" content="Y" />"""
    pattern = rf'<meta\s+property="{prop}"\s+content="([^"]*)"'
    match = re.search(pattern, html, re.IGNORECASE)
    if match:
        return match.group(1)
    pattern2 = rf'<meta\s+content="([^"]*)"\s+property="{prop}"'
    match2 = re.search(pattern2, html, re.IGNORECASE)
    return match2.group(1) if match2 else None


def extract_title(html: str) -> Optional[str]:
    """Extract <title>...</title>"""
    match = re.search(r'<title>([^<]*)</title>', html, re.IGNORECASE)
    return match.group(1) if match else None


def has_heading(html: str, level: int) -> bool:
    """Check if heading level exists in HTML (including noscript)"""
    return bool(re.search(rf'<h{level}[\s>]', html, re.IGNORECASE))


def count_meta_duplicates(html: str) -> list:
    """Find duplicate meta name tags"""
    names = re.findall(r'<meta\s+name="([^"]*)"', html, re.IGNORECASE)
    seen = {}
    dupes = []
    for name in names:
        n = name.lower()
        seen[n] = seen.get(n, 0) + 1
    for n, count in seen.items():
        if count > 1:
            dupes.append(n)
    return dupes


def audit_html(html: str, source_file: str) -> SEOReport:
    """Run all SEO checks on an HTML string."""
    report = SEOReport(page=source_file)

    # --- Title ---
    report.title = extract_title(html)
    if report.title:
        report.title_length = len(report.title)
        if report.title_length > 60:
            report.findings.append(Finding(
                severity="MEDIUM",
                category="title-too-long",
                message=f"Title tag is {report.title_length} chars (target: 30-60)",
                current_value=report.title,
                target="30-60 characters",
                file=source_file,
                fix="Shorten title to under 60 characters. Keep brand name + primary keyword."
            ))
            report.score -= 5
        elif report.title_length < 30:
            report.findings.append(Finding(
                severity="MEDIUM",
                category="title-too-short",
                message=f"Title tag is {report.title_length} chars (target: 30-60)",
                current_value=report.title,
                target="30-60 characters",
                file=source_file,
                fix="Expand title to at least 30 characters with relevant keywords."
            ))
            report.score -= 5
    else:
        report.findings.append(Finding(
            severity="CRITICAL",
            category="missing-title",
            message="No <title> tag found",
            current_value="(none)",
            target="30-60 character title tag",
            file=source_file,
            fix="Add a <title> tag with brand name and primary keyword."
        ))
        report.score -= 20

    # --- Meta Description ---
    report.meta_description = extract_meta(html, "description")
    if report.meta_description:
        report.meta_description_length = len(report.meta_description)
        if report.meta_description_length > 160:
            report.findings.append(Finding(
                severity="HIGH",
                category="description-too-long",
                message=f"Meta description is {report.meta_description_length} chars (target: 50-160)",
                current_value=report.meta_description,
                target="50-160 characters",
                file=source_file,
                fix="Shorten description to under 160 characters. Keep the value proposition clear."
            ))
            report.score -= 10
        elif report.meta_description_length < 50:
            report.findings.append(Finding(
                severity="MEDIUM",
                category="description-too-short",
                message=f"Meta description is {report.meta_description_length} chars (target: 50-160)",
                current_value=report.meta_description,
                target="50-160 characters",
                file=source_file,
                fix="Expand description to at least 50 characters with a clear call-to-action."
            ))
            report.score -= 5
    else:
        report.findings.append(Finding(
            severity="CRITICAL",
            category="missing-description",
            message="No meta description found",
            current_value="(none)",
            target="50-160 character description",
            file=source_file,
            fix="Add <meta name=\"description\" content=\"...\"> with a compelling summary."
        ))
        report.score -= 20

    # --- OG Description ---
    report.og_description = extract_property(html, "og:description")
    if report.og_description:
        report.og_description_length = len(report.og_description)
        if report.og_description_length > 160:
            report.findings.append(Finding(
                severity="MEDIUM",
                category="og-description-too-long",
                message=f"OG description is {report.og_description_length} chars (target: <160)",
                current_value=report.og_description,
                target="Under 160 characters",
                file=source_file,
                fix="Shorten og:description to under 160 characters for social card previews."
            ))
            report.score -= 5

    # --- Twitter Description ---
    report.twitter_description = extract_meta(html, "twitter:description")
    if report.twitter_description:
        report.twitter_description_length = len(report.twitter_description)
        if report.twitter_description_length > 160:
            report.findings.append(Finding(
                severity="MEDIUM",
                category="twitter-description-too-long",
                message=f"Twitter description is {report.twitter_description_length} chars (target: <160)",
                current_value=report.twitter_description,
                target="Under 160 characters",
                file=source_file,
                fix="Shorten twitter:description to under 160 characters."
            ))
            report.score -= 5

    # --- Keywords ---
    keywords_str = extract_meta(html, "keywords")
    if keywords_str:
        report.keywords = [k.strip() for k in keywords_str.split(",") if k.strip()]
        report.keyword_count = len(report.keywords)
        if report.keyword_count > 8:
            report.findings.append(Finding(
                severity="HIGH",
                category="too-many-keywords",
                message=f"Found {report.keyword_count} keyword phrases (target: 3-8)",
                current_value=keywords_str,
                target="3-8 focused keyword phrases",
                file=source_file,
                fix="Reduce to 3-8 focused keyword phrases. Remove redundant/overlapping terms."
            ))
            report.score -= 10
        elif report.keyword_count < 3:
            report.findings.append(Finding(
                severity="LOW",
                category="too-few-keywords",
                message=f"Found {report.keyword_count} keyword phrases (target: 3-8)",
                current_value=keywords_str,
                target="3-8 focused keyword phrases",
                file=source_file,
                fix="Add more keyword phrases covering your primary topics."
            ))
            report.score -= 3

    # --- Heading Structure ---
    report.has_h1 = has_heading(html, 1)
    report.has_h2 = has_heading(html, 2)

    if not report.has_h1:
        report.findings.append(Finding(
            severity="HIGH",
            category="missing-h1",
            message="No H1 heading found on this page",
            current_value="(none)",
            target="One H1 heading per page",
            file=source_file,
            fix="Add an H1 heading with the page's primary topic. For SPAs, add in noscript or ensure the rendered page includes one."
        ))
        report.score -= 10

    if not report.has_h2:
        report.findings.append(Finding(
            severity="HIGH",
            category="missing-h2",
            message="No H2 heading found on this page",
            current_value="(none)",
            target="At least one H2 heading for content structure",
            file=source_file,
            fix="Add H2 headings to structure content. For SPAs, include in noscript section for crawlers."
        ))
        report.score -= 10

    # --- Canonical ---
    report.has_canonical = bool(re.search(r'<link\s+rel="canonical"', html, re.IGNORECASE))
    if not report.has_canonical:
        report.findings.append(Finding(
            severity="MEDIUM",
            category="missing-canonical",
            message="No canonical URL found",
            current_value="(none)",
            target="<link rel=\"canonical\" href=\"...\">",
            file=source_file,
            fix="Add a canonical link to prevent duplicate content issues."
        ))
        report.score -= 5

    # --- OG Image ---
    report.has_og_image = bool(extract_property(html, "og:image"))
    if not report.has_og_image:
        report.findings.append(Finding(
            severity="MEDIUM",
            category="missing-og-image",
            message="No OG image found",
            current_value="(none)",
            target="og:image meta tag with 1200x630 image",
            file=source_file,
            fix="Add <meta property=\"og:image\" content=\"...\"> for social sharing previews."
        ))
        report.score -= 5

    # --- Duplicate Meta Tags ---
    dupes = count_meta_duplicates(html)
    for dupe in dupes:
        report.findings.append(Finding(
            severity="MEDIUM",
            category="duplicate-meta",
            message=f"Duplicate meta tag: {dupe}",
            current_value=f"meta name=\"{dupe}\" appears multiple times",
            target="Each meta name should appear only once",
            file=source_file,
            fix=f"Remove duplicate <meta name=\"{dupe}\"> tags. Keep only one."
        ))
        report.score -= 5

    # Clamp score
    report.score = max(0, report.score)
    return report


def find_html_files(project_path: str) -> list:
    """Find index.html files in a web project."""
    candidates = [
        "client/index.html",
        "index.html",
        "public/index.html",
        "src/index.html",
        "dist/index.html",
    ]
    found = []
    for candidate in candidates:
        full_path = os.path.join(project_path, candidate)
        if os.path.isfile(full_path):
            found.append(full_path)
    return found


def fetch_page(url: str) -> Optional[str]:
    """Fetch a live page via curl."""
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "15", url],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout
    except (subprocess.TimeoutExpired, Exception):
        pass
    return None


def print_report(report: SEOReport, verbose: bool = False):
    """Print human-readable report."""
    print(f"\n{'='*60}")
    print(f"SEO AUDIT: {report.page}")
    print(f"{'='*60}")
    print(f"Score: {report.score}/100")
    print()

    # Summary table
    print("METRICS:")
    print(f"  Title:              {report.title_length} chars {'✓' if 30 <= report.title_length <= 60 else '✗'}")
    print(f"  Meta Description:   {report.meta_description_length} chars {'✓' if 50 <= report.meta_description_length <= 160 else '✗'}")
    print(f"  OG Description:     {report.og_description_length} chars {'✓' if report.og_description_length <= 160 else '✗'}")
    print(f"  Twitter Desc:       {report.twitter_description_length} chars {'✓' if report.twitter_description_length <= 160 else '✗'}")
    print(f"  Keywords:           {report.keyword_count} phrases {'✓' if 3 <= report.keyword_count <= 8 else '✗'}")
    print(f"  H1 Present:         {'✓' if report.has_h1 else '✗'}")
    print(f"  H2 Present:         {'✓' if report.has_h2 else '✗'}")
    print(f"  Canonical:          {'✓' if report.has_canonical else '✗'}")
    print(f"  OG Image:           {'✓' if report.has_og_image else '✗'}")
    print()

    if not report.findings:
        print("✅ No issues found!")
        return

    # Group by severity
    by_severity = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": []}
    for f in report.findings:
        by_severity[f.severity].append(f)

    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        items = by_severity[sev]
        if not items:
            continue
        icon = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵"}[sev]
        print(f"{icon} {sev} ({len(items)}):")
        for f in items:
            print(f"  [{f.category}] {f.message}")
            if verbose:
                print(f"    Current: {f.current_value[:80]}{'...' if len(f.current_value) > 80 else ''}")
                print(f"    Target:  {f.target}")
                print(f"    Fix:     {f.fix}")
                print()
        if not verbose:
            print()


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    project_path = args[0]
    verbose = "--verbose" in args
    json_output = "--json" in args
    url = None

    if "--url" in args:
        url_idx = args.index("--url") + 1
        if url_idx < len(args):
            url = args[url_idx]

    reports = []

    if url:
        html = fetch_page(url)
        if html:
            reports.append(audit_html(html, url))
        else:
            print(f"ERROR: Could not fetch {url}", file=sys.stderr)
            sys.exit(1)
    else:
        html_files = find_html_files(project_path)
        if not html_files:
            print(f"ERROR: No index.html found in {project_path}", file=sys.stderr)
            print("Searched: client/index.html, index.html, public/index.html, src/index.html, dist/index.html")
            sys.exit(1)

        for html_file in html_files:
            with open(html_file, "r", encoding="utf-8") as f:
                html = f.read()
            reports.append(audit_html(html, html_file))

    if json_output:
        output = []
        for r in reports:
            output.append({
                "page": r.page,
                "score": r.score,
                "title_length": r.title_length,
                "meta_description_length": r.meta_description_length,
                "og_description_length": r.og_description_length,
                "keyword_count": r.keyword_count,
                "has_h1": r.has_h1,
                "has_h2": r.has_h2,
                "has_canonical": r.has_canonical,
                "has_og_image": r.has_og_image,
                "findings": [asdict(f) for f in r.findings]
            })
        print(json.dumps(output, indent=2))
    else:
        for r in reports:
            print_report(r, verbose)

    # Exit code: 1 if any CRITICAL or HIGH findings
    has_serious = any(
        f.severity in ("CRITICAL", "HIGH")
        for r in reports
        for f in r.findings
    )
    sys.exit(1 if has_serious else 0)


if __name__ == "__main__":
    main()
