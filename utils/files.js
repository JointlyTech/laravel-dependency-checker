import fs from 'fs'

export function *traverse(directory) {
  const files = fs.readdirSync(directory)
  for (const file of files) {
    const path = `${directory}/${file}`
    if (fs.statSync(path).isDirectory()) {
      yield *traverse(path)
    }
    else {
      yield {
        filePath: path,
        content: fs.readFileSync(path, 'utf8'),
      }
    }
  }
}