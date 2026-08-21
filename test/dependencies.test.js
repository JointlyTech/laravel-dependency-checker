import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDependencies, catalogDependencies, knownKinds } from '../utils/dependencies.js';

const extract = content => extractDependencies(content, []);

test('extracts plain imports', () => {
  assert.deepEqual(extract('<?php\nuse App\\Models\\User;\n'), ['App\\Models\\User']);
});

test('resolves the fully qualified name of an aliased import', () => {
  assert.deepEqual(extract('<?php\nuse App\\Services\\FooService as Foo;\n'), ['App\\Services\\FooService']);
});

test('expands a group import', () => {
  assert.deepEqual(
    extract('<?php\nuse App\\Models\\{Company, Wallet\\Credit as C};\n'),
    ['App\\Models\\Company', 'App\\Models\\Wallet\\Credit']
  );
});

test('expands a multi-line group import', () => {
  assert.deepEqual(
    extract('<?php\nuse App\\Models\\{\n  Company,\n  User,\n};\n'),
    ['App\\Models\\Company', 'App\\Models\\User']
  );
});

test('extracts function and const imports', () => {
  assert.deepEqual(
    extract('<?php\nuse function App\\Helpers\\thing;\nuse const App\\Constants\\FOO;\n'),
    ['App\\Helpers\\thing', 'App\\Constants\\FOO']
  );
});

test('strips a leading backslash', () => {
  assert.deepEqual(extract('<?php\nuse \\App\\Models\\User;\n'), ['App\\Models\\User']);
});

test('ignores a trait imported inside a class body', () => {
  const content = `<?php
use Illuminate\\Database\\Eloquent\\SoftDeletes;

class Wallet extends Model
{
  use SoftDeletes;
  use HasFactory;
}`;
  assert.deepEqual(extract(content), ['Illuminate\\Database\\Eloquent\\SoftDeletes']);
});

test('ignores traits inside an interface, a trait and an enum body', () => {
  for (const declaration of ['interface Foo', 'trait Foo', 'enum Foo: string', 'abstract class Foo', 'final readonly class Foo']) {
    assert.deepEqual(extract(`<?php\nuse App\\Models\\User;\n\n${declaration}\n{\n  use SomeTrait;\n}`), ['App\\Models\\User']);
  }
});

test('ignores a closure use clause', () => {
  const content = `<?php
class Foo
{
  public function bar()
  {
    return function ()
      use ($baz) { return $baz; };
  }
}`;
  assert.deepEqual(extract(content), []);
});

test('honours dependency exclusions', () => {
  assert.deepEqual(
    extractDependencies('<?php\nuse App\\Models\\User;\nuse App\\Models\\Company;\n', ['App\\Models\\User']),
    ['App\\Models\\Company']
  );
});

test('excludes an aliased dependency by its fully qualified name', () => {
  assert.deepEqual(
    extractDependencies('<?php\nuse App\\Constants\\CoreConstants as C;\n', ['App\\Constants\\CoreConstants']),
    []
  );
});

test('catalogs built-in kinds without overlapping', () => {
  const deps = [
    'App\\Http\\Controllers\\Controller',
    'App\\Services\\FooService',
    'App\\Models\\User',
    'App\\Helpers\\Thing',
    'Illuminate\\Http\\Request'
  ];
  const catalog = catalogDependencies(deps);

  assert.deepEqual(catalog.controllers, ['App\\Http\\Controllers\\Controller']);
  assert.deepEqual(catalog.services, ['App\\Services\\FooService']);
  assert.deepEqual(catalog.models, ['App\\Models\\User']);
  assert.deepEqual(catalog.other_app, ['App\\Helpers\\Thing']);
  assert.deepEqual(catalog.other_all, ['Illuminate\\Http\\Request']);
  assert.equal(catalog.all.length, 5);
});

test('does not count a controller as other_app', () => {
  assert.deepEqual(catalogDependencies(['App\\Http\\Controllers\\Controller']).other_app, []);
});

test('matches a kind on namespace boundaries only', () => {
  const catalog = catalogDependencies(['App\\ServicesLegacy\\FooService', 'App\\Services']);

  assert.deepEqual(catalog.services, ['App\\Services']);
  assert.deepEqual(catalog.other_app, ['App\\ServicesLegacy\\FooService']);
});

test('catalogs custom kinds', () => {
  const catalog = catalogDependencies(
    ['Illuminate\\Http\\Request', 'App\\Http\\Requests\\StoreFoo', 'App\\Models\\User'],
    { http: ['Illuminate\\Http', 'App\\Http\\Requests'] }
  );

  assert.deepEqual(catalog.http, ['Illuminate\\Http\\Request', 'App\\Http\\Requests\\StoreFoo']);
  assert.ok(knownKinds({ http: [] }).includes('http'));
});
