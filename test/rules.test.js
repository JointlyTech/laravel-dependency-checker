import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRule, validateRule, applyRuleSet, expressResultAsText } from '../utils/rules.js';
import { knownKinds } from '../utils/dependencies.js';

test('parses a rule', () => {
  assert.deepEqual(parseRule('services lte 3'), { kind: 'services', operator: 'lte', amount: 3 });
});

test('parses a rule with extra whitespace', () => {
  assert.deepEqual(parseRule('  services   lte   3 '), { kind: 'services', operator: 'lte', amount: 3 });
});

test('rejects an unknown kind', () => {
  assert.match(validateRule(parseRule('service lte 3'), knownKinds()), /unknown dependency kind "service"/);
});

test('rejects an unknown operator', () => {
  assert.match(validateRule(parseRule('services less 3'), knownKinds()), /unknown operator "less"/);
});

test('rejects a non-numeric amount', () => {
  assert.match(validateRule(parseRule('services lte many'), knownKinds()), /not a number/);
});

test('accepts a valid rule', () => {
  assert.equal(validateRule(parseRule('services lte 3'), knownKinds()), null);
});

test('accepts a rule on a custom kind', () => {
  assert.equal(validateRule(parseRule('http eq 0'), knownKinds({ http: ['Illuminate\\Http'] })), null);
});

test('reports the observed value of a failing rule', () => {
  const results = applyRuleSet({ services: ['a', 'b', 'c'] }, [parseRule('services lte 1')]);

  assert.equal(results[0].matched, false);
  assert.equal(results[0].value, 3);
  assert.equal(expressResultAsText(results[0]), 'services lte 1 (found 3)');
});

test('applies every operator', () => {
  const dependencies = { all: ['a', 'b'] };
  const matched = rule => applyRuleSet(dependencies, [parseRule(rule)])[0].matched;

  assert.equal(matched('all eq 2'), true);
  assert.equal(matched('all neq 2'), false);
  assert.equal(matched('all gt 1'), true);
  assert.equal(matched('all gte 2'), true);
  assert.equal(matched('all lt 2'), false);
  assert.equal(matched('all lte 2'), true);
});
