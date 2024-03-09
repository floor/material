import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Construct __dirname equivalent for ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const doccoOutputDir = path.join(__dirname, '../docs/src') // Path to Docco output directory
const indexFilePath = path.join(__dirname, '..', 'docs', 'index.html') // Path to your index file

let indexContent = '<html><head><title>Library Index</title></head><body>'
indexContent += '<h1>Index of Documented Modules</h1><ul>'

fs.readdirSync(doccoOutputDir).forEach(file => {
  console.log('file', file)
  if (path.extname(file) === '.html') {
    const moduleName = path.basename(file, '.html')
    indexContent += `<li><a href="src/${file}">${moduleName}</a></li>`
  }
})

indexContent += '</ul></body></html>'

fs.writeFileSync(indexFilePath, indexContent, 'utf8')
console.log('Index file generated at:', indexFilePath)
