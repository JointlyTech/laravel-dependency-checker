const CLASS_DECLARATION = /^[ \t]*(?:(?:abstract|final|readonly)[ \t]+)*(?:class|interface|trait|enum)[ \t]+\w/m;
const IMPORT = /^[ \t]*use[ \t\r\n]+([^;{()$]+?)(?:\{([^}]*)\})?[ \t\r\n]*;/gm;

const BUILTIN_KINDS = {
  controllers: ['App\\Http\\Controllers'],
  services: ['App\\Services'],
  models: ['App\\Models']
};

// A `use` inside a class body imports a trait, not a dependency, and `use ($var)`
// inside a closure is not an import at all. Both only ever appear after the type
// declaration, so everything from there on is discarded before matching.
function importSection(content) {
  const declaration = content.match(CLASS_DECLARATION);
  return declaration ? content.slice(0, declaration.index) : content;
}

function stripSymbolKeyword(statement) {
  return statement.replace(/^(?:function|const)[ \t\r\n]+/, '');
}

function stripAlias(statement) {
  return statement.replace(/[ \t\r\n]+as[ \t\r\n]+\w+$/, '');
}

function normalize(statement) {
  return stripAlias(stripSymbolKeyword(statement.trim())).replace(/^\\/, '').trim();
}

function matchesExclusion(name, pattern) {
  const startsOpen = pattern.startsWith('*');
  const endsOpen = pattern.length > 1 && pattern.endsWith('*');
  const literal = pattern.slice(startsOpen ? 1 : 0, endsOpen ? -1 : undefined);

  if (startsOpen && endsOpen) return name.includes(literal);
  if (startsOpen) return name.endsWith(literal);
  if (endsOpen) return name.startsWith(literal);
  return name === literal;
}

export function extractDependencies(content, exclusions) {
  const dependencies = [];
  let match;
  IMPORT.lastIndex = 0;
  while ((match = IMPORT.exec(importSection(content)))) {
    const [, head, group] = match;
    const names = group === undefined
      ? [normalize(head)]
      : group.split(',').map(name => normalize(head) + normalize(name)).filter(name => !name.endsWith('\\'));

    for (const name of names) {
      if (name === '' || exclusions.some(pattern => matchesExclusion(name, pattern))) {
        continue;
      }
      dependencies.push(name);
    }
  }
  return dependencies;
}

function belongsTo(dependency, prefixes) {
  return prefixes.some(prefix => dependency === prefix || dependency.startsWith(`${prefix}\\`));
}

export function catalogDependencies(deps, customKinds = {}) {
  const dependencies = { all: deps };

  for (const [kind, prefixes] of Object.entries({ ...BUILTIN_KINDS, ...customKinds })) {
    dependencies[kind] = deps.filter(dep => belongsTo(dep, prefixes));
  }

  const categorised = Object.values(BUILTIN_KINDS).flat();
  dependencies.other_app = deps.filter(dep => dep.startsWith('App\\') && !belongsTo(dep, categorised));
  dependencies.other_all = deps.filter(dep => !dep.startsWith('App\\'));

  return dependencies;
}

export function knownKinds(customKinds = {}) {
  return [...Object.keys(BUILTIN_KINDS), ...Object.keys(customKinds), 'other_app', 'other_all', 'all'];
}
