#!/usr/bin/env node

let fs = require("fs")
let path = require("path")
let request = require("request")
let argv = require("yargs")
  .usage('Usage: $0 [options]')
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'config file detailing 3rd party libraries')
  .alias('w', 'working')
  .nargs('w', 1)
  .describe('w', 'the working directory to run in')
  .alias('d', 'diff-dir')
  .nargs('d', 1)
  .describe('d', 'the directory to output files to diff')
  .demandOption(['c'])
  .help('help')
  .alias('h', 'help')
  .alias('v', 'version').argv

let referenceFile = argv.config
let workingDir = argv.working || __dirname

let librariesRaw = fs.readFileSync(referenceFile)
let libraries = JSON.parse(librariesRaw.toString())

if (argv.diffDir) {
  if (!fs.existsSync(argv.diffDir)) fs.mkdirSync(argv.diffDir)
  let left = path.join(argv.diffDir, 'left')
  let right = path.join(argv.diffDir, 'right')
  if (!fs.existsSync(left)) fs.mkdirSync(left)
  if (!fs.existsSync(right)) fs.mkdirSync(right)
}

let saveDiffs = (library, left, right) => {
  if (argv.diffDir) {
    let leftFile = path.join(argv.diffDir,'/left/',`${library}.js`)
    let rightFile = path.join(argv.diffDir,'/right/',`${library}.js`)
    fs.writeFileSync(leftFile, left, {})
    fs.writeFileSync(rightFile, right)
  }
}

libraries.forEach(library => {
  if (fs.existsSync(path.join(workingDir, library.location))) {
    request(library.source, (err, response, body) => {
      let downloaded = body
      let compareFile = fs
        .readFileSync(path.join(workingDir, library.location))
        .toString()
      let offset = library.offset || 0
      let length = library.length || downloaded.length

      downloaded = downloaded.replace(/\r\n/g, "\n");
      compareFile = compareFile.substr(offset, length)
      compareFile = compareFile.replace(/\r\n/g, "\n");
      if (library.modified) {
        console.log(`${library.library} - modified`)
        saveDiffs(library.library, downloaded, compareFile)
      } else {
        let equal = compareFile == downloaded
        console.log(`${library.library} - ${equal ? "passed" : "failed"}`)
        if (!equal) {
          saveDiffs(library.library, downloaded, compareFile)
        }
      }
    })
  } else {
    console.log(`${library.library} - The given file doesn't exist`)
  }
})
