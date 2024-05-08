import { extractDependencies, catalogDependencies } from "./dependencies.js"
import { applyRuleSet, expressRuleAsText } from "./rules.js"
import { traverse } from "./files.js"

export function analyze({folder, ruleSet, config}) {
  const output = [];
  let satisfiableFilesAmount = 0;
  let fileAmount = 0;
  for (const {filePath, content} of traverse(folder)) {
    if(config.exclusions.files.includes(filePath)) {
      continue;
    }
    fileAmount++;
    const deps = extractDependencies(content, config.exclusions.dependencies);
    const dependencies = catalogDependencies(deps);
    const ruleApplicationResults = applyRuleSet(dependencies, ruleSet);
    if(ruleApplicationResults.filter(rule => !rule.matched).length === 0) {
      satisfiableFilesAmount++;
    } else {
      output.push({
        filePath,
        ruleApplicationResults: ruleApplicationResults.filter(result => !result.matched).map(result => expressRuleAsText(result.rule))
      });
    }
  }

  return {output, thresholdSatisfied: satisfiableFilesAmount / fileAmount >= config.threshold / 100};
}