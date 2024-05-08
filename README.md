# What is this?

> The tool is mainly intended to be used internally in Jointly as a CI/CD pipeline step. Even if the tool works as expected, we don't consider it to be a production-ready tool.

This is a simple tool to execute a set of code-based dependency checks. 
This tool works on Laravel projects but, as it analyzes `use` statements, it could potentially be used in any PHP project.

As of right now, no checks are made to ensure that the path is a valid path in the project or the rules are valid rules. Please, keep it in mind when using this tool.

# How to use it?

Create a folder in your repository called `dependency-rules` and create as many `.yml` files as you want with the following structure:

```yml
name: check_example
description: 'Example Check'
path: /app/Http/Controllers
threshold: 80
exclusions:
  dependencies:
    - App\Http\Controllers\Controller
  files:
    - app/Http/Controllers/Wallet/TransactionController.php
ruleset:
  - controllers eq 0
  - services lte 3
  - models lte 5
  - other_app lte 8
  - other_all lte 12
  - all lte 20
```

The `name` field is the name of the dependency check, the `description` field is a brief description, the `path` field is the path to the folder you want to analyze, the `threshold` field is the minimum number of non-error rules that must be met to pass the dependency check and the `ruleset` field is an array of rules to be executed.

After creating the `.yml` files, you can run the tool by executing the following command:

```bash
npx @jointly/laravel-dependency-checker
````



## Rules

The rules are composed of three parts; the first part is the type of the dependency, the second part is the operator and the third part is the value.

### Types
- `controllers`: Number of dependency controllers (App\Http\Controllers)
- `services`: Number of dependency services (App\Services)
- `models`: Number of dependency models (App\Models)
- `other_app`: Number of dependencies from the same application (App)
- `other_all`: Number of dependencies from any other part of the application
- `all`: Number of all the dependencies

### Operators
- `eq`: Equal to
- `neq`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to