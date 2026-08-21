import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyze } from '../utils/analysis.js';
import { parseRule } from '../utils/rules.js';

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ldc-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

const run = (root, ruleset, config = {}) => analyze({
  root,
  folder: './app/Services',
  ruleSet: ruleset.map(parseRule),
  config: {
    threshold: 100,
    kinds: {},
    exclusions: { files: [], dependencies: [] },
    ...config
  }
});

test('reports the offending file with the observed value', () => {
  const root = fixture({
    'app/Services/FooService.php': '<?php\nuse App\\Models\\User;\nuse App\\Models\\Company;\n',
    'app/Services/BarService.php': '<?php\nuse App\\Models\\User;\n'
  });

  const result = run(root, ['models lte 1']);

  assert.equal(result.fileAmount, 2);
  assert.equal(result.satisfiableFilesAmount, 1);
  assert.equal(result.thresholdSatisfied, false);
  assert.deepEqual(result.output, [{
    filePath: 'app/Services/FooService.php',
    ruleApplicationResults: ['models lte 1 (found 2)']
  }]);
});

test('ignores non-php files', () => {
  const root = fixture({
    'app/Services/FooService.php': '<?php\n',
    'app/Services/.gitkeep': '',
    'app/Services/fix_files.sh': 'echo hi'
  });

  assert.equal(run(root, ['all eq 0']).fileAmount, 1);
});

test('excludes a file by its project-relative path', () => {
  const root = fixture({
    'app/Services/FooService.php': '<?php\nuse App\\Models\\User;\n',
    'app/Services/BarService.php': '<?php\n'
  });

  const result = run(root, ['models eq 0'], { exclusions: { files: ['app/Services/FooService.php'], dependencies: [] } });

  assert.equal(result.fileAmount, 1);
  assert.equal(result.thresholdSatisfied, true);
});

test('traverses subfolders', () => {
  const root = fixture({
    'app/Services/FooService.php': '<?php\n',
    'app/Services/Wallet/BarService.php': '<?php\nuse App\\Models\\User;\n'
  });

  const result = run(root, ['models eq 0'], { threshold: 50 });

  assert.equal(result.fileAmount, 2);
  assert.equal(result.satisfiedPercentage, 50);
  assert.equal(result.thresholdSatisfied, true);
  assert.equal(result.output[0].filePath, 'app/Services/Wallet/BarService.php');
});

test('applies a rule on a custom kind', () => {
  const root = fixture({ 'app/Services/FooService.php': '<?php\nuse Illuminate\\Http\\Request;\n' });

  const result = run(root, ['http eq 0'], { kinds: { http: ['Illuminate\\Http'] } });

  assert.equal(result.thresholdSatisfied, false);
  assert.deepEqual(result.output[0].ruleApplicationResults, ['http eq 0 (found 1)']);
});

test('an empty folder satisfies the threshold', () => {
  const root = fixture({ 'app/Services/.gitkeep': '' });

  assert.equal(run(root, ['all eq 0']).thresholdSatisfied, true);
});
