#!/usr/bin/env python3
"""
Data Lifecycle Bug Detector

Scans a web application codebase for common data lifecycle bugs:
1. NULL-as-stale: WHERE clauses that treat NULL timestamps as "old"
2. Seed/job mismatch: Seed functions that leave timestamps NULL + jobs that target NULL
3. Silent data destruction: Bulk UPDATE/DELETE without guard clauses
4. Empty catch blocks on data operations
5. Status-blind authentication: Login functions that don't check account status

Usage:
    python detect_lifecycle_bugs.py <project_path> [--json] [--verbose]

Output:
    Prints findings grouped by severity (CRITICAL, HIGH, MEDIUM, LOW)
    With --json flag, outputs machine-readable JSON
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

# ─── Configuration ────────────────────────────────────────────────────────────

# File extensions to scan
SCAN_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql', '.py'}

# Directories to skip
SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'}

# ─── Bug Pattern Definitions ──────────────────────────────────────────────────

@dataclass
class Finding:
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    message: str
    file: str
    line: int
    code: str
    fix: str
    context: list = field(default_factory=list)


# Pattern 1: NULL-as-stale
# Matches: WHERE/where/filter conditions that OR NULL with < comparison on time fields
NULL_AS_STALE_PATTERNS = [
    # SQL-style: IS NULL OR field < threshold
    re.compile(
        r'(\w*(?:last|updated|created|modified|activity|login|clock|seen|active|expire|access)\w*)'
        r'\s+IS\s+NULL\s+OR\s+\1\s*[<]',
        re.IGNORECASE
    ),
    # Drizzle/ORM-style: isNull(field), lt(field, ...)  in same expression
    re.compile(
        r'or\s*\(\s*isNull\s*\(\s*\w*\.(\w*(?:last|updated|created|modified|activity|login|clock|seen|active|expire|access)\w*)\s*\)\s*,\s*lt\s*\(',
        re.IGNORECASE
    ),
    # Generic: .isNull() combined with lessThan/lt/before in same block
    re.compile(
        r'(\w*(?:last|updated|created|modified|activity|login|clock|seen|active|expire|access)\w*)\s*\)\s*\.\s*isNull\(\)',
        re.IGNORECASE
    ),
    # WHERE field IS NULL OR field < (with any spacing)
    re.compile(
        r'where.*?(\w*(?:last|updated|created|modified|activity|login|clock|seen|active|expire|access)\w*)\s*(?:is\s+null|===?\s*null|==\s*None).*?(?:or|\|\|).*?\1\s*[<]',
        re.IGNORECASE | re.DOTALL
    ),
]

# Pattern 2: Seed functions with NULL timestamps
SEED_NULL_PATTERNS = [
    # Function named seed/init/create that sets timestamp fields to null/undefined
    re.compile(
        r'(?:last|updated|created|modified|activity|login|clock|seen|active|expire|access)\w*\s*[:=]\s*(?:null|undefined|None|nil)',
        re.IGNORECASE
    ),
]

# Pattern 3: Bulk operations without guards
BULK_DANGER_PATTERNS = [
    # UPDATE ... SET status = 'inactive'/'archived'/'deleted' without specific WHERE
    re.compile(
        r'\.(?:update|set)\s*\(.*?(?:status|active|archived|deleted|inactive)',
        re.IGNORECASE
    ),
]

# Pattern 4: Archive/cleanup/purge function signatures
LIFECYCLE_JOB_PATTERNS = [
    re.compile(
        r'(?:async\s+)?(?:function|const|export)\s+\w*(?:archive|cleanup|purge|deactivate|expire|sweep|prune|remove(?:Old|Stale|Inactive))\w*',
        re.IGNORECASE
    ),
]

# Pattern 5: Login without status check (server-side only)
LOGIN_NO_STATUS_PATTERNS = [
    re.compile(
        r'(?:login|authenticate|getBy(?:Pin|Password|Email|Token))\w*',
        re.IGNORECASE
    ),
]

# Files to exclude from login status check (frontend helpers and framework internals)
LOGIN_EXCLUDE_PATHS = {'const.ts', 'const.js', 'hooks/', 'contexts/', 'components/', '_core/'}

# Pattern 6: Empty catch blocks
EMPTY_CATCH_PATTERNS = [
    re.compile(r'\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)'),
    re.compile(r'\.catch\s*\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)'),
    re.compile(r'catch\s*\(\s*\w*\s*\)\s*\{\s*\}'),
]

# Pattern 7: Public endpoints exposing data
PUBLIC_DATA_PATTERNS = [
    re.compile(
        r'publicProcedure.*?(?:staff|user|employee|member|account|customer)\w*',
        re.IGNORECASE
    ),
]

# Known-safe public endpoint patterns (intentionally public)
PUBLIC_SAFE_PATTERNS = [
    re.compile(r'auth\.me|me:\s*publicProcedure\.query\(.*ctx\.user', re.IGNORECASE),
    re.compile(r'health|ping|status', re.IGNORECASE),
]


# ─── Scanner ──────────────────────────────────────────────────────────────────

def scan_file(filepath: Path, lines: list[str]) -> list[Finding]:
    """Scan a single file for data lifecycle bugs."""
    findings = []
    rel_path = str(filepath)
    content = '\n'.join(lines)

    # --- NULL-as-stale detection ---
    for pattern in NULL_AS_STALE_PATTERNS:
        for match in pattern.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            code_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
            findings.append(Finding(
                severity="CRITICAL",
                category="NULL-as-stale",
                message=f"Timestamp field treated as stale when NULL. NULL records will be incorrectly targeted.",
                file=rel_path,
                line=line_num,
                code=code_line,
                fix="Change to: field IS NOT NULL AND field < threshold. Exclude NULL records from staleness checks.",
                context=_get_context(lines, line_num, 3)
            ))

    # --- Seed functions with NULL timestamps ---
    # Only flag if file contains seed/init function
    is_seed_file = bool(re.search(r'(?:seed|init|fixture|factory)\w*', content, re.IGNORECASE))
    if is_seed_file:
        for pattern in SEED_NULL_PATTERNS:
            for match in pattern.finditer(content):
                line_num = content[:match.start()].count('\n') + 1
                code_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
                # Check if this is inside a seed/create function
                preceding = content[:match.start()]
                last_func = preceding.rfind('function')
                last_const = preceding.rfind('const')
                func_start = max(last_func, last_const)
                if func_start >= 0:
                    func_context = preceding[func_start:func_start+100]
                    if re.search(r'(?:seed|init|create|insert|fixture)', func_context, re.IGNORECASE):
                        findings.append(Finding(
                            severity="HIGH",
                            category="Seed-NULL-timestamp",
                            message=f"Seed/init function sets timestamp to null. Records become targets for archive/cleanup jobs.",
                            file=rel_path,
                            line=line_num,
                            code=code_line,
                            fix="Set timestamp to a recent realistic value: new Date() or Date.now().",
                            context=_get_context(lines, line_num, 2)
                        ))

    # --- Lifecycle jobs (archive/cleanup/purge) ---
    for pattern in LIFECYCLE_JOB_PATTERNS:
        for match in pattern.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            code_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
            # Check if the function body contains NULL handling
            func_body = content[match.start():match.start()+2000]
            has_null_check = bool(re.search(r'IS\s+NULL|isNull|===?\s*null', func_body, re.IGNORECASE))
            has_not_null_guard = bool(re.search(r'IS\s+NOT\s+NULL|isNotNull|!==?\s*null', func_body, re.IGNORECASE))

            if has_null_check and not has_not_null_guard:
                findings.append(Finding(
                    severity="CRITICAL",
                    category="Unguarded-lifecycle-job",
                    message=f"Lifecycle job uses NULL check without NOT NULL guard. Will destroy records that have never been active.",
                    file=rel_path,
                    line=line_num,
                    code=code_line,
                    fix="Add IS NOT NULL guard: only target records that HAVE a timestamp AND it's old. Skip NULL records.",
                    context=_get_context(lines, line_num, 2)
                ))
            elif not has_null_check and not has_not_null_guard:
                findings.append(Finding(
                    severity="MEDIUM",
                    category="Lifecycle-job-no-null-handling",
                    message=f"Lifecycle job doesn't explicitly handle NULL timestamps. Verify behavior with NULL records.",
                    file=rel_path,
                    line=line_num,
                    code=code_line,
                    fix="Add explicit IS NOT NULL guard to ensure NULL-timestamp records are excluded.",
                    context=_get_context(lines, line_num, 2)
                ))

    # --- Login without status check (server-side files only) ---
    is_server_file = any(part in str(filepath) for part in ['server/', 'api/', 'routes/'])
    is_excluded_path = any(excl in str(filepath) for excl in LOGIN_EXCLUDE_PATHS)
    if is_server_file and not is_excluded_path:
        for pattern in LOGIN_NO_STATUS_PATTERNS:
            for match in pattern.finditer(content):
                line_num = content[:match.start()].count('\n') + 1
                # Look at the function body (next 30 lines)
                func_body = '\n'.join(lines[line_num-1:line_num+30])
                has_status_check = bool(re.search(
                    r'status.*(?:active|===|!==|!=|==)|\.status\b|isActive|is_active',
                    func_body, re.IGNORECASE
                ))
                if not has_status_check and ('function' in lines[line_num-1] or 'const' in lines[line_num-1]):
                    # Only flag actual function definitions, not calls
                    if re.search(r'(?:async\s+)?(?:function|const)\s+\w*(?:login|authenticate|getBy(?:Pin|Password|Email|Token))', lines[line_num-1], re.IGNORECASE):
                        findings.append(Finding(
                            severity="HIGH",
                            category="Status-blind-auth",
                            message=f"Authentication function doesn't check account status. Inactive/terminated users can still log in.",
                            file=rel_path,
                            line=line_num,
                            code=lines[line_num-1].strip(),
                            fix="Add status check: reject login if user.status !== 'active'.",
                            context=_get_context(lines, line_num, 2)
                        ))

    # --- Empty catch blocks on data operations ---
    for pattern in EMPTY_CATCH_PATTERNS:
        for match in pattern.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            code_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
            # Check if it's near a data operation
            preceding_lines = '\n'.join(lines[max(0, line_num-5):line_num])
            is_data_op = bool(re.search(
                r'insert|update|delete|create|save|put|post|mutation|archive|seed',
                preceding_lines, re.IGNORECASE
            ))
            if is_data_op:
                findings.append(Finding(
                    severity="MEDIUM",
                    category="Silent-data-failure",
                    message=f"Empty catch block near data operation. Failures will be invisible.",
                    file=rel_path,
                    line=line_num,
                    code=code_line,
                    fix="Log the error or propagate it. Silent failures make debugging impossible.",
                    context=_get_context(lines, line_num, 2)
                ))

    # --- Public endpoints exposing sensitive data ---
    for pattern in PUBLIC_DATA_PATTERNS:
        for match in pattern.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            code_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
            # Skip known-safe patterns (auth.me, health checks)
            is_safe = any(sp.search(code_line) for sp in PUBLIC_SAFE_PATTERNS)
            if not is_safe:
                findings.append(Finding(
                    severity="HIGH",
                    category="Public-sensitive-data",
                    message=f"Public endpoint appears to expose user/staff data without authentication.",
                    file=rel_path,
                    line=line_num,
                    code=code_line,
                    fix="Change to protectedProcedure or add authentication check.",
                    context=_get_context(lines, line_num, 2)
                ))

    return findings


def _get_context(lines: list[str], line_num: int, radius: int) -> list[str]:
    """Get surrounding lines for context."""
    start = max(0, line_num - radius - 1)
    end = min(len(lines), line_num + radius)
    return [f"{'>' if i == line_num - 1 else ' '} {i+1}: {lines[i]}" for i in range(start, end)]


def scan_project(project_path: str, verbose: bool = False) -> list[Finding]:
    """Scan entire project for data lifecycle bugs."""
    findings = []
    project = Path(project_path)

    if not project.exists():
        print(f"Error: Path '{project_path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    file_count = 0
    for root, dirs, files in os.walk(project):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in files:
            filepath = Path(root) / filename
            if filepath.suffix not in SCAN_EXTENSIONS:
                continue

            file_count += 1
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.read().splitlines()
            except (IOError, OSError):
                continue

            # Make path relative to project root
            rel_filepath = filepath.relative_to(project)
            file_findings = scan_file(rel_filepath, lines)
            findings.extend(file_findings)

    if verbose:
        print(f"Scanned {file_count} files in {project_path}", file=sys.stderr)

    return findings


# ─── Output Formatting ────────────────────────────────────────────────────────

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
SEVERITY_COLORS = {
    "CRITICAL": "\033[91m",  # Red
    "HIGH": "\033[93m",      # Yellow
    "MEDIUM": "\033[96m",    # Cyan
    "LOW": "\033[90m",       # Gray
}
RESET = "\033[0m"


def format_findings(findings: list[Finding], use_json: bool = False) -> str:
    """Format findings for output."""
    if use_json:
        return json.dumps([asdict(f) for f in findings], indent=2)

    if not findings:
        return "✅ No data lifecycle bugs detected."

    # Sort by severity
    findings.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 99))

    # Group by severity
    output = []
    output.append(f"\n{'='*70}")
    output.append(f" DATA LIFECYCLE BUG REPORT — {len(findings)} finding(s)")
    output.append(f"{'='*70}\n")

    current_severity = None
    for f in findings:
        if f.severity != current_severity:
            current_severity = f.severity
            color = SEVERITY_COLORS.get(f.severity, "")
            output.append(f"\n{color}── {f.severity} ──{RESET}\n")

        output.append(f"  [{f.category}] {f.file}:{f.line}")
        output.append(f"  {f.message}")
        output.append(f"  Code: {f.code}")
        output.append(f"  Fix:  {f.fix}")
        if f.context:
            output.append("  Context:")
            for ctx_line in f.context:
                output.append(f"    {ctx_line}")
        output.append("")

    # Summary
    by_severity = {}
    for f in findings:
        by_severity[f.severity] = by_severity.get(f.severity, 0) + 1

    output.append(f"\n{'─'*70}")
    output.append(" SUMMARY")
    output.append(f"{'─'*70}")
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        if sev in by_severity:
            output.append(f"  {sev}: {by_severity[sev]}")
    output.append("")

    return '\n'.join(output)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Detect data lifecycle bugs in web application codebases"
    )
    parser.add_argument("project_path", help="Path to the project root directory")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show scan progress")

    args = parser.parse_args()

    findings = scan_project(args.project_path, verbose=args.verbose)
    output = format_findings(findings, use_json=args.json)
    print(output)

    # Exit code: 1 if critical/high findings, 0 otherwise
    has_critical = any(f.severity in ("CRITICAL", "HIGH") for f in findings)
    sys.exit(1 if has_critical else 0)


if __name__ == "__main__":
    main()
