export function applyRuleSet(dependencies, ruleSet) {
  return ruleSet.map(rule => {
    if(!applyRule(dependencies, rule)) {
      return {
        rule,
        matched: false
      }
    } else {
      return {
        rule,
        matched: true
      }
    }
});
}

function applyRule(dependencies, rule) {
  const { kind, operator, amount } = rule;
  const value = dependencies[kind].length;
  return compare(value, operator, amount);
}

export function expressRuleAsText(rule) {
  return `${rule.kind} ${rule.operator} ${rule.amount}`;
}

function compare(value, operator, amount) {
  const comparisonFunctions = {
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
  };

  return comparisonFunctions[operator](value, amount);
}