export function extractDependencies(content, exclusions) {
  const dependencies = [];
  const regex = /use ([\w\\]+);/g;
  let match;
  while (match = regex.exec(content)) {
    if (exclusions.includes(match[1])) {
      continue;
    }
    dependencies.push(match[1]);
  }
  return dependencies;
}


export function catalogDependencies(deps) {
  const dependencies = {
    controllers: deps.filter(dep => dep.startsWith('App\\Http\\Controllers\\')),
    services: deps.filter(dep => dep.startsWith('App\\Services\\')),
    models: deps.filter(dep => dep.startsWith('App\\Models\\')),
    other_app: [],
    other_all: [],
    all: deps
  }

  for (const dep of deps) {
    if (dep.startsWith('App\\')) {
      if (!dependencies.services.includes(dep) && !dependencies.models.includes(dep)) {
        dependencies.other_app.push(dep)
      }
    }
    else {
      dependencies.other_all.push(dep)
    }
  }

  return dependencies
}