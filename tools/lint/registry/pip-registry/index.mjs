#!/usr/bin/env node
// Usage: node check_pypi.js <package-name>

import fetch from "node-fetch";

const pkg = process.argv[2];
if (!pkg) {
  console.error("Usage: node check_pypi.js <package-name>");
  process.exit(1);
}

const url = `https://pypi.org/pypi/${pkg}/json`;

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Package not found");
  const data = await res.json();

  const versions = Object.keys(data.releases).sort().reverse().slice(0, 5);

  console.log(`✅ Package '${pkg}' found on PyPI`);
  console.log("📦 Latest 5 versions:", versions.join(", "));

  const hasWheel = Object.values(data.releases)
    .flat()
    .some((f) => f.filename.endsWith(".whl"));

  console.log(
    hasWheel ? "🧩 Wheel (.whl) files available." : "⚠️ No wheel files found."
  );
} catch (e) {
  console.error(`❌ Error: ${e.message}`);
}
