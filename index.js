#!/usr/bin/env node

let fs = require("fs")
let path = require("path")
let request = require("request")
let argv = require("yargs")
  .usage("Usage: $0 [options]")
  .alias("c", "config")
  .nargs("c", 1)
  .describe("c", "config file detailing 3rd party libraries")
  .alias("w", "working")
  .nargs("w", 1)
  .describe("w", "the working directory to run in")
  .alias("d", "diff-dir")
  .nargs("d", 1)
  .describe("d", "the directory to output files to diff")
  .alias("v", "verbose")
  .nargs("v", 0)
  .describe("v", "adds more detail when outputting")
  .help("help")
  .alias("h", "help").argv

// save the left and right of a comparison into the folder specified
// in diff-dir argument
let saveDiffs = (library, left, right) => {
  if (argv.diffDir) {
    let leftFile = path.join(argv.diffDir, "/left/", `${library}.js`)
    let rightFile = path.join(argv.diffDir, "/right/", `${library}.js`)
    fs.writeFileSync(leftFile, left, {})
    fs.writeFileSync(rightFile, right)
  }
}

let compareLibrary = library => {
  return new Promise((resolve, reject) => {
    // mutating library object here. Probably not a good idea but we can look
    // at that later
    library.localPath = path.join(workingDir, library.location)
    // make sure the local file exists
    if (fs.existsSync(library.localPath)) {
      // look for the original source online
      request(library.source, (err, response, body) => {
        let downloaded = body
        // read in the local file
        let compareFile = fs.readFileSync(library.localPath).toString()

        // set the offset numbers in case, otherwise start at the beginning of the file
        let offset = library.offset || 0
        // set the length if specified, otherwise use the length of the downloaded body.
        let length = library.length || downloaded.length

        // ensure all CRLFs become LFs just to be safe
        downloaded = downloaded.replace(/\r\n/g, "\n")

        // cut the local content down to what's specified above
        compareFile = compareFile.substr(offset, length)

        // ensure all CRLFs become LFs just to be safe
        compareFile = compareFile.replace(/\r\n/g, "\n")
        if (library.modified) {
          // config specified modified so we just output that and
          // save diffs if specified
          logResults(library, logColor("MODIFIED", "red"))
          saveDiffs(library.library, downloaded, compareFile)
          counts.modified++
        } else if (compareFile == downloaded) {
          // files are the same, no modifications made
          logResults(library, logColor("PASSED", "green"))
          counts.passed++
        } else {
          // files are different, something's changed
          logResults(library, logColor("FAILED", "red"), "Files are different")
          saveDiffs(library.library, downloaded, compareFile)
          counts.failed++
        }
        resolve()
      })
    } else {
      // couldn't find the local file...that's a fail
      logResults(library, logColor("FAILED", "red"), "Local file not found")
      counts.failed++
      resolve()
    }
  })
}

// wraps the given text in code that indicates to the console to use colors
let logColor = (text, color) => {
  switch (color) {
    case "red":
      return `\x1b[31m${text}\x1b[0m`
    case "green":
      return `\x1b[32m${text}\x1b[0m`
  }
}

// show our total counts
let logFinalResults = () => {
  logSpacers(1)
  console.log("           ======Final Results======")
  console.log(`               Passed: ${counts.passed}`)
  console.log(`               Failed: ${counts.failed}`)
  console.log(`             Modified: ${counts.modified}`)
  logSpacers(3)
}

// show the library's info
let logResults = (library, result, reason) => {
  console.log(`              Library: ${library.library}`)
  console.log(`              Version: ${library.version}`)
  console.log(`              Purpose: ${library.purpose}`)
  console.log(`         Project Page: ${library.projectPage}`)
  console.log(`             Modified: ${library.modified}`)
  if (library.modified) {
    // only need to show this if the lib is modified
    console.log(`  Modification Reason: ${library.modificationReason}`)
  }
  if (argv.verbose) {
    // show the URLs for debugging purposes
    console.log(`           Source URL: ${library.source}`)
    console.log(`           Local Path: ${library.localPath}`)
  }
  console.log(`               Result: ${result}`)
  if (reason) console.log(`               Reason: ${reason}`)
  logSpacers(1)
}

// save some 'console.log' typing
let logSpacers = count => {
  for (let i = 0; i < count; i++) {
    console.log("")
  }
}

let workingDir = argv.working || process.cwd()

let counts = {
  passed: 0,
  failed: 0,
  modified: 0
}

let configFile = argv.config || path.join(workingDir, "3parch.json")
if (fs.existsSync(configFile)) {
  let librariesRaw = fs.readFileSync(configFile)
  let libraries = JSON.parse(librariesRaw.toString())

  if (argv.diffDir) {
    // if a diff directory is specified we want to make sure it exists
    if (!fs.existsSync(argv.diffDir)) fs.mkdirSync(argv.diffDir)
    let left = path.join(argv.diffDir, "left")
    let right = path.join(argv.diffDir, "right")
    if (!fs.existsSync(left)) fs.mkdirSync(left)
    if (!fs.existsSync(right)) fs.mkdirSync(right)
  }

  logSpacers(3)
  Promise.all(libraries.map(compareLibrary)).then(logFinalResults)
} else {
  console.log(
    "Specify a config file with '--config' or create a '3parch.json' file in the working directory"
  )
}
