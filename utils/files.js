import fs from 'fs'

// A git worktree under .claude, a vendor folder or a node_modules tree can hold a
// whole second copy of the project: traversing them is both slow and wrong, since
// their files are not the ones under review.
const IGNORED_DIRECTORIES = ['vendor', 'node_modules']

function isIgnoredDirectory(name) {
  return name.startsWith('.') || IGNORED_DIRECTORIES.includes(name)
}

export function *traverse(directory) {
  const files = fs.readdirSync(directory)
  for (const file of files) {
    const path = `${directory}/${file}`
    if (fs.statSync(path).isDirectory()) {
      if (isIgnoredDirectory(file)) {
        continue
      }
      yield *traverse(path)
    }
    else if (path.endsWith('.php')) {
      yield {
        filePath: path,
        content: fs.readFileSync(path, 'utf8'),
      }
    }
  }
}
