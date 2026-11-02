#!/usr/bin/env python3
"""Inspect only files staged for publication; print locations, never matched values."""
import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DENIED_PARTS = {'.private', '.openai', 'backups', 'outputs', 'node_modules', '__pycache__', 'atualizacoes'}
DENIED_SUFFIXES = {'.apk', '.idsig', '.p12', '.jks', '.key', '.pem', '.keystore', '.pyc', '.log'}
PATTERNS = {
    'Google API key': r'AIza[0-9A-Za-z_-]{30,}',
    'Google OAuth token': r'ya29\.[0-9A-Za-z._-]{20,}',
    'GitHub token': r'(?:gh[pousr]_[0-9A-Za-z]{25,}|github_pat_[0-9A-Za-z_]{40,})',
    'private key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    '32-character hexadecimal credential': r'(?<![0-9A-Fa-f])[0-9A-Fa-f]{32}(?![0-9A-Fa-f])',
    'private IPv4 address': r'\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b',
    'device MAC': r'\b(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}\b',
    'personal macOS home path': r'/Users/' + r'(?!example\b|USER\b)[^/\s\x22\x27]+/',
    'ADB device identity': r'adb-[0-9A-Fa-f]{12}-[A-Za-z0-9]+',
    'embedded URL credential': r'https?://[^\s/:]+:[^\s/@]+@',
}

def inspect(path, data):
    findings = []
    p = Path(path)
    if DENIED_PARTS.intersection(p.parts) or p.suffix.lower() in DENIED_SUFFIXES or p.name.startswith('.env'):
        findings.append((path, 0, 'private/generated path'))
    if b'\0' in data:
        return findings
    text = data.decode('utf-8', errors='replace')
    for label, pattern in PATTERNS.items():
        for match in re.finditer(pattern, text):
            findings.append((path, text.count('\n', 0, match.start()) + 1, label))
    return findings

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--staged', action='store_true', help='Inspect index entries (default).')
    parser.add_argument('--tracked', action='store_true', help='Inspect all tracked files, for CI.')
    args = parser.parse_args()
    command = ['git', 'ls-files', '-z'] if args.tracked else ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    paths = subprocess.check_output(command, cwd=ROOT).decode().split('\0')
    findings = []
    for path in filter(None, paths):
        data = subprocess.check_output(['git', 'show', ':' + path], cwd=ROOT)
        findings.extend(inspect(path, data))
    for path, line, label in findings:
        print(f'{path}:{line}: {label}')
    print(f'Inspected {len([p for p in paths if p])} selected files; {len(findings)} findings.')
    return 1 if findings else 0

if __name__ == '__main__':
    raise SystemExit(main())
