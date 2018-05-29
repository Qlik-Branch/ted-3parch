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
  .demandOption(["c"])
  .help("help")
  .alias("h", "help")
  .alias("v", "version").argv

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
    if (fs.existsSync(path.join(workingDir, library.location))) {
      request(library.source, (err, response, body) => {
        let downloaded = body
        let compareFile = fs
          .readFileSync(path.join(workingDir, library.location))
          .toString()
        let offset = library.offset || 0
        let length = library.length || downloaded.length

        downloaded = downloaded.replace(/\r\n/g, "\n")
        compareFile = compareFile.substr(offset, length)
        compareFile = compareFile.replace(/\r\n/g, "\n")
        if (library.modified) {
          logResults(library, logColor("MODIFIED", "red"))
          saveDiffs(library.library, downloaded, compareFile)
          counts.modified++
          resolve()
        } else {
          if (compareFile == downloaded) {
            logResults(library, logColor("PASSED", "green"))
            counts.passed++
          } else {
            logResults(
              library,
              logColor("FAILED", "red"),
              "Files are different"
            )
            saveDiffs(library.library, downloaded, compareFile)
            counts.failed++
          }
          resolve()
        }
      })
    } else {
      logResults(
        library,
        logColor("FAILED", "red"),
        "Local file not found"
      )
      counts.failed++
      resolve()
    }
  })
}

let logColor = (text, color) => {
  switch (color) {
    case "red":
      return `\x1b[31m${text}\x1b[0m`
    case "green":
      return `\x1b[32m${text}\x1b[0m`
  }
}

let logFinalResults = () => {
  logSpacers(1)
  console.log("           ======Final Results======")
  console.log(`               Passed: ${counts.passed}`)
  console.log(`               Failed: ${counts.failed}`)
  console.log(`             Modified: ${counts.modified}`)
  logSpacers(3)
}

let logResults = (library, result, reason) => {
  console.log(`              Library: ${library.library}`)
  console.log(`              Version: ${library.version}`)
  console.log(`              Purpose: ${library.purpose}`)
  console.log(`         Project Page: ${library.projectPage}`)
  console.log(`             Modified: ${library.modified}`)
  if (library.modified) {
    console.log(`  Modification Reason: ${library.modificationReason}`)
  }
  console.log(`               Result: ${result}`)
  if (reason) console.log(`               Reason: ${reason}`)
  logSpacers(1)
}

let logSpacers = count => {
  for (let i = 0; i < count; i++) {
    console.log("")
  }
}



let referenceFile = argv.config
let workingDir = argv.working || process.cwd()

let counts = {
  passed: 0,
  failed: 0,
  modified: 0
}

let librariesRaw = fs.readFileSync(referenceFile)
let libraries = JSON.parse(librariesRaw.toString())

if (argv.diffDir) {
  if (!fs.existsSync(argv.diffDir)) fs.mkdirSync(argv.diffDir)
  let left = path.join(argv.diffDir, "left")
  let right = path.join(argv.diffDir, "right")
  if (!fs.existsSync(left)) fs.mkdirSync(left)
  if (!fs.existsSync(right)) fs.mkdirSync(right)
}

logSpacers(3)
Promise.all(libraries.map(compareLibrary)).then(logFinalResults)
