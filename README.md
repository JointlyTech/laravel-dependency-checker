# What is this?

> The tool is mainly intended to be used internally in Jointly as a CI/CD pipeline step. Even if the tool works as expected, we don't consider it to be a production-ready tool.

This is a simple tool to execute a set of code-based dependency checks. 
This tool works on Laravel projects but, as it analyzes `use` statements, it could potentially be used in any PHP project.

As of right now, no checks are made to ensure that the path is a valid path in the project. Rulesets, on the other hand, are validated: an unknown kind, an unknown operator or a non-numeric amount stops the run with an explicit error.

# How to use it?

Create a folder in your repository called `dependency-rules` and create as many `.yml` files as you want with the following structure:

```yml
name: check_example
description: 'Example Check'
path: /app/Http/Controllers
threshold: 80
kinds:
  http:
    - 'Illuminate\Http'
    - 'App\Http\Requests'
exclusions:
  dependencies:
    - App\Http\Controllers\Controller
  files:
    - app/Http/Controllers/Wallet/TransactionController.php
ruleset:
  - controllers eq 0
  - services lte 3
  - models lte 5
  - http eq 0
  - other_app lte 8
  - other_all lte 12
  - all lte 20
```

The `name` field is the name of the dependency check, the `description` field is a brief description, the `path` field is the path to the folder you want to analyze (relative to the folder containing the rules folder), the `threshold` field is the minimum percentage of files that must satisfy every rule for the check to pass, the `kinds` field declares additional dependency kinds (see below) and the `ruleset` field is an array of rules to be executed.

After creating the `.yml` files, you can run the tool by executing the following command:

```bash
npx @jointly/laravel-dependency-checker
```

Every check is executed on every run: a failing check doesn't stop the ones after it. The output tells you, for each check, how many files satisfy the whole ruleset:

```
✅ controllers — 277/277 files (100.0%, threshold 100%)
❌ maintainability-services — 128/164 files (78.0%, threshold 80%)

maintainability-services — Maintaining current assessed situation
  app/Services/CompanyService.php: services lte 2 (found 5), all lte 10 (found 54)
```

Failing checks are also written to `output.json` inside the rules folder, with the observed value of every unsatisfied rule.

## Rules

The rules are composed of three parts; the first part is the kind of the dependency, the second part is the operator and the third part is the value.

### Kinds
- `controllers`: dependencies in `App\Http\Controllers`
- `services`: dependencies in `App\Services`
- `models`: dependencies in `App\Models`
- `other_app`: dependencies in `App` that are none of the above
- `other_all`: dependencies outside of `App`
- `all`: every dependency

`controllers`, `services`, `models`, `other_app` and `other_all` are mutually exclusive and add up to `all`.

You can declare your own kinds through the `kinds` field, mapping a name to a list of namespace prefixes. A custom kind is matched on namespace boundaries — `App\Services` matches `App\Services\FooService` but not `App\ServicesLegacy\FooService` — and it may overlap the built-in ones, which is what makes rules like "a service must not depend on the HTTP layer" expressible:

```yml
kinds:
  http:
    - 'Illuminate\Http'
    - 'App\Http\Requests'
ruleset:
  - http eq 0
```

Quote the prefixes with single quotes: in double-quoted YAML strings, `\` is an escape character.

### Operators
- `eq`: Equal to
- `neq`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to

## What counts as a dependency

Only `use` statements outside of any type declaration are counted, in every form: plain, aliased (`use A\B as C;` counts as `A\B`), grouped (`use A\{B, C};` counts as two), and `use function` / `use const`. A `use` inside a class body imports a trait, not a dependency, and is ignored — as is the `use` clause of a closure. Only `.php` files are analyzed.

## Thresholds and baselines

A threshold below 100 means "this percentage of files must comply", not "these files may not comply": it doesn't record *which* files are currently failing. Two consequences are worth knowing before picking a value:

- a new violation can be paid for by adding compliant files, since only the ratio is checked;
- deleting a compliant file lowers the ratio, so it can turn the check red without anything else changing.

For invariants — anything shaped like `controllers eq 0` — prefer `threshold: 100` and list the files that violate it today under `exclusions.files`. That baseline is a list you can only shrink, and it makes a new violation fail the change that introduced it. Keep the percentage form for count caps (`all lte 20`), where it works as a don't-get-worse gate.

## Development

```bash
npm test
```
