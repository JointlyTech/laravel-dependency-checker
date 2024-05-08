#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yamlReader from 'js-yaml';
import { performance } from "perf_hooks";
import { analyze } from "../utils/analysis.js";

const rulesFolder = process.argv[2] || `${process.cwd()}/dependency-rules`;

if (!rulesFolder) {
  console.log('Please provide a YAML file path');
  process.exit(1);
}


let start, end;
start = performance.now();
for (const yamlPath of fs.readdirSync(rulesFolder)) {
  if (!yamlPath.endsWith('.yml')) {
    continue;
  }
  const yamlContent = yamlReader.load(fs.readFileSync(path.join(rulesFolder, yamlPath), 'utf8'));
  if (typeof yamlContent !== 'object') {
    console.error('Invalid YAML content');
    process.exit(1);
  }

  const analysisResult = analyze({
    folder: path.join(yamlPath, '../', yamlContent.path),
    ruleSet: yamlContent.ruleset.map(rule => ({
      kind: rule.split(' ')[0],
      operator: rule.split(' ')[1],
      amount: parseInt(rule.split(' ')[2]),
    })),
    config: {
      threshold: yamlContent.threshold ?? 100,
      exclusions: {
        files: yamlContent.exclusions?.files ?? [],
        dependencies: yamlContent.exclusions?.dependencies ?? []
      }
    }
  });
  if (!analysisResult.thresholdSatisfied) {
    console.error({
      name: yamlContent.name,
      description: yamlContent.description,
      output: analysisResult.output
    });
    end = performance.now();
    console.log(`Execution time: ${(end - start).toFixed(0)}ms`);
    console.log('❌ A rule wasn\'t satisfied. An output.json file is being created in the rules folder...');
    fs.writeFileSync(path.resolve(rulesFolder, 'output.json'), JSON.stringify(analysisResult.output, null, 2));
    process.exit(1);
  }
}
end = performance.now();
console.log('🚀 All rules satisfied!');
console.log(`Execution time: ${(end - start).toFixed(0)}ms`);