import path from 'path'
import { extractDependencies, catalogDependencies } from "./dependencies.js"
import { applyRuleSet, expressResultAsText } from "./rules.js"
import { traverse } from "./files.js"

export function analyze({root, folder, ruleSet, config}) {
  const output = [];
  let satisfiableFilesAmount = 0;
  let fileAmount = 0;
  for (const {filePath, content} of traverse(path.resolve(root, folder))) {
    const relativePath = path.relative(root, filePath);
    if(config.exclusions.files.includes(relativePath)) {
      continue;
    }
    fileAmount++;
    const deps = extractDependencies(content, config.exclusions.dependencies);
    const dependencies = catalogDependencies(deps, config.kinds);
    const ruleApplicationResults = applyRuleSet(dependencies, ruleSet);
    const failures = ruleApplicationResults.filter(result => !result.matched);
    if(failures.length === 0) {
      satisfiableFilesAmount++;
    } else {
      output.push({
        filePath: relativePath,
        ruleApplicationResults: failures.map(expressResultAsText)
      });
    }
  }

  const satisfiedPercentage = fileAmount === 0 ? 100 : (satisfiableFilesAmount / fileAmount) * 100;

  return {
    output,
    fileAmount,
    satisfiableFilesAmount,
    satisfiedPercentage,
    thresholdSatisfied: satisfiedPercentage >= config.threshold
  };
}
