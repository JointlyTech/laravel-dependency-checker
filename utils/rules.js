const comparisonFunctions = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
};

export function parseRule(rule) {
  const [kind, operator, amount] = `${rule}`.trim().split(/\s+/);
  return { kind, operator, amount: parseInt(amount) };
}

export function validateRule(rule, availableKinds) {
  const { kind, operator, amount } = rule;
  if (!availableKinds.includes(kind)) {
    return `unknown dependency kind "${kind}". Available kinds: ${availableKinds.join(', ')}`;
  }
  if (!Object.hasOwn(comparisonFunctions, operator)) {
    return `unknown operator "${operator}". Available operators: ${Object.keys(comparisonFunctions).join(', ')}`;
  }
  if (Number.isNaN(amount)) {
    return `the amount of "${expressRuleAsText(rule)}" is not a number`;
  }
  return null;
}

export function applyRuleSet(dependencies, ruleSet) {
  return ruleSet.map(rule => {
    const value = dependencies[rule.kind].length;
    return {
      rule,
      value,
      matched: compare(value, rule.operator, rule.amount)
    };
  });
}

export function expressRuleAsText(rule) {
  return `${rule.kind} ${rule.operator} ${rule.amount}`;
}

export function expressResultAsText(result) {
  return `${expressRuleAsText(result.rule)} (found ${result.value})`;
}

function compare(value, operator, amount) {
  return comparisonFunctions[operator](value, amount);
}
