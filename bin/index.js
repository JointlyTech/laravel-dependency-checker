#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yamlReader from 'js-yaml';
import { performance } from "perf_hooks";
import { analyze } from "../utils/analysis.js";
import { knownKinds } from "../utils/dependencies.js";
import { parseRule, validateRule } from "../utils/rules.js";

const rulesFolder = path.resolve(process.argv[2] || `${process.cwd()}/dependency-rules`);

if (!fs.existsSync(rulesFolder)) {
  console.error(`The rules folder ${rulesFolder} does not exist.`);
  process.exit(1);
}

// Paths inside a check are expressed relative to the project, which is the folder
// containing the rules folder.
const projectRoot = path.resolve(rulesFolder, '..');
const start = performance.now();
const failures = [];

for (const yamlPath of fs.readdirSync(rulesFolder).sort()) {
  if (!yamlPath.endsWith('.yml')) {
    continue;
  }
  const yamlContent = yamlReader.load(fs.readFileSync(path.join(rulesFolder, yamlPath), 'utf8'));
  if (typeof yamlContent !== 'object' || yamlContent === null) {
    console.error(`Invalid YAML content in ${yamlPath}`);
    process.exit(1);
  }

  const kinds = yamlContent.kinds ?? {};
  const ruleSet = (yamlContent.ruleset ?? []).map(parseRule);
  const invalidRules = ruleSet
    .map(rule => validateRule(rule, knownKinds(kinds)))
    .filter(Boolean);

  if (invalidRules.length > 0) {
    console.error(`Invalid ruleset in ${yamlPath}:`);
    for (const message of invalidRules) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  const analysisResult = analyze({
    root: projectRoot,
    folder: `.${path.sep}${path.normalize(yamlContent.path)}`,
    ruleSet,
    config: {
      threshold: yamlContent.threshold ?? 100,
      kinds,
      exclusions: {
        files: yamlContent.exclusions?.files ?? [],
        dependencies: yamlContent.exclusions?.dependencies ?? []
      }
    }
  });

  const summary = `${analysisResult.satisfiableFilesAmount}/${analysisResult.fileAmount} files (${analysisResult.satisfiedPercentage.toFixed(1)}%, threshold ${yamlContent.threshold ?? 100}%)`;

  if (analysisResult.thresholdSatisfied) {
    console.log(`✅ ${yamlContent.name} — ${summary}`);
    continue;
  }

  console.log(`❌ ${yamlContent.name} — ${summary}`);
  failures.push({
    name: yamlContent.name,
    description: yamlContent.description,
    files: analysisResult.fileAmount,
    satisfyingFiles: analysisResult.satisfiableFilesAmount,
    satisfiedPercentage: Number(analysisResult.satisfiedPercentage.toFixed(2)),
    threshold: yamlContent.threshold ?? 100,
    output: analysisResult.output
  });
}

const end = performance.now();

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`\n${failure.name} — ${failure.description}`);
    for (const { filePath, ruleApplicationResults } of failure.output) {
      console.error(`  ${filePath}: ${ruleApplicationResults.join(', ')}`);
    }
  }
  console.log(`\nExecution time: ${(end - start).toFixed(0)}ms`);
  console.log(`❌ ${failures.length} check(s) weren't satisfied. An output.json file is being created in the rules folder...`);
  fs.writeFileSync(path.resolve(rulesFolder, 'output.json'), JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log('🚀 All rules satisfied!');
console.log(`Execution time: ${(end - start).toFixed(0)}ms`);
