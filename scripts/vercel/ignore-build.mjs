#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DOCS_ONLY_PATTERNS = [
  /^docs\//,
  /^README\.md$/,
  /^CONTRIBUTING\.md$/,
  /^SECURITY\.md$/,
  /^SUPPORT\.md$/,
  /^LICENSE\.md$/,
  /^\.github\//,
  /^\.env\.example$/,
];

function runGit(args) {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function log(message) {
  console.log(`[ignore-build] ${message}`);
}

function hasParentCommit() {
  const result = runGit(["rev-parse", "--verify", "HEAD^"]);
  return result.status === 0;
}

function getChangedFiles() {
  const result = runGit(["diff", "--name-only", "--diff-filter=ACDMRTUXB", "HEAD^", "HEAD"]);

  if (result.status !== 0) {
    log("Unable to inspect changed files. Proceeding with build.");
    return null;
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isDocsOnlyFile(path) {
  return DOCS_ONLY_PATTERNS.some((pattern) => pattern.test(path));
}

if (!hasParentCommit()) {
  log("No parent commit is available. Proceeding with build.");
  process.exit(1);
}

const changedFiles = getChangedFiles();

if (!changedFiles || changedFiles.length === 0) {
  log("No changed files were detected. Proceeding with build.");
  process.exit(1);
}

const deployRelevantFiles = changedFiles.filter((path) => !isDocsOnlyFile(path));

if (deployRelevantFiles.length === 0) {
  log(`Skipping build for docs-only changes: ${changedFiles.join(", ")}`);
  process.exit(0);
}

log(`Proceeding with build due to deploy-affecting changes: ${deployRelevantFiles.join(", ")}`);
process.exit(1);
