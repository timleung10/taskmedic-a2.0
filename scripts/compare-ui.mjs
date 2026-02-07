import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const root = process.cwd();
const pairs = [
  { name: "home-collapsed", actual: "test-results/ui/home-collapsed.png", expected: "reference/home-collapsed.png" },
  { name: "home-expanded", actual: "test-results/ui/home-expanded.png", expected: "reference/home-expanded.png" }
];

const maxDiffRatio = 0.015;
let failed = false;

for (const pair of pairs) {
  const actualPath = path.join(root, pair.actual);
  const expectedPath = path.join(root, pair.expected);
  if (!fs.existsSync(actualPath)) {
    console.error(`Missing actual screenshot: ${pair.actual}`);
    failed = true;
    continue;
  }
  if (!fs.existsSync(expectedPath)) {
    console.error(`Missing reference screenshot: ${pair.expected}`);
    failed = true;
    continue;
  }

  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  const expected = PNG.sync.read(fs.readFileSync(expectedPath));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    console.error(`Size mismatch for ${pair.name}: actual ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`);
    failed = true;
    continue;
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
    threshold: 0.1
  });
  const diffRatio = diffPixels / (actual.width * actual.height);
  const diffPath = path.join(root, `test-results/ui/diff-${pair.name}.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  console.log(`${pair.name}: ${(diffRatio * 100).toFixed(2)}% diff`);
  if (diffRatio > maxDiffRatio) failed = true;
}

if (failed) {
  console.error(`UI diff exceeds ${(maxDiffRatio * 100).toFixed(2)}% threshold.`);
  process.exit(1);
}
