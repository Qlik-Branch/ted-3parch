#!/usr/bin/env node

let fs = require('fs')
let path = require("path")
let request = require("request")
let ProgressBar = require("progress")
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
  .string(["w", "c", "d"])
  .boolean("v")
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

// Remove all files from a 1st level folder
let cleanFolder = function (path) {
    fs.readdirSync(path).forEach(function (file, index) {
      let curPath = path + "/" + file;
      if (!fs.lstatSync(curPath).isDirectory()) { // recurse
        fs.unlinkSync(curPath);
      }
    });
};

let compareLibrary = currentLibrary => {
  return new Promise((resolve, reject) => {
    // using the spread to shallow copy is fine here since it's all
    // simple properties at the moment
    let library = { ...currentLibrary }

    // pushing now to keep the libraries in order so the async
    // of request calls doesn't mess things up
    processedLibraries.push(library)
    library.localPath = path.join(workingDir, library.location)
    // make sure the local file exists
    if (fs.existsSync(library.localPath)) {
      // look for the original source online
      request(library.source, (err, response, body) => {
        if (response && response.statusCode === 200) {
          let downloaded = body
          // read in the local file
          let compareFile = fs.readFileSync(library.localPath).toString()

          // ensure all CRLFs become LFs just to be safe
          downloaded = downloaded.replace(/\r\n/g, "\n")
          // ensure all CRLFs become LFs just to be safe
          compareFile = compareFile.replace(/\r\n/g, "\n")

          // set the offset numbers in case, otherwise start at the beginning of the file
          let offset = library.offset || 0
          // set the length if specified, otherwise use the length of the downloaded body.
          let length = library.length || compareFile.length - offset

          // cut the local content down to what's specified above
          compareFile = compareFile.substr(offset, length)

          if (library.modified) {
            // config specified modified so we just output that and
            // save diffs if specified
            library.result = "MODIFIED"
            saveDiffs(library.library, downloaded, compareFile)
          } else if (compareFile == downloaded) {
            // files are the same, no modifications made
            library.result = "PASSED"
          } else {
            // files are different, something's changed
            library.result = "FAILED"
            library.resultReason = "Files are different"
            saveDiffs(library.library, downloaded, compareFile)
          }
          resolve()
          bar.tick()
        } else {
          library.result = "FAILED"
          library.resultReason = `Received ${response &&
            response.statusCode} status code from HTTP source request.`
          resolve()
          bar.tick()
        }
      })
    } else {
      // couldn't find the local file...that's a fail
      library.result = "FAILED"
      library.resultReason = "Local file not found"
      resolve()
      bar.tick()
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
  console.log(
    `               Passed: ${
      processedLibraries.filter(lib => lib.result === "PASSED").length
    }`
  )
  console.log(
    `               Failed: ${
      processedLibraries.filter(lib => lib.result === "FAILED").length
    }`
  )
  console.log(
    `             Modified: ${
      processedLibraries.filter(lib => lib.result === "MODIFIED").length
    }`
  )
}

// show the library's info
let logResults = library => {
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
  console.log(`               Result: ${getResultWithColor(library.result)}`)
  if (library.resultReason)
    console.log(`               Reason: ${library.resultReason}`)
  logSpacers(1)
}

// save some 'console.log' typing
let logSpacers = count => {
  for (let i = 0; i < count; i++) {
    console.log("")
  }
}

let getResultWithColor = result => {
  return logColor(result, result === "PASSED" ? "green" : "red")
}

let processedLibraries = []

let workingDir = argv.working || process.cwd()
let bar

let configFile = argv.config || path.join(workingDir, "3parch.json")
if (fs.existsSync(configFile)) {
  let librariesRaw = fs.readFileSync(configFile)
  let libraries = JSON.parse(librariesRaw.toString())
  logSpacers(2)
  bar = new ProgressBar(
    "              Running: :bar :current/:total (:eta secs)",
    { width: libraries.length * 4, total: libraries.length, clear: true }
  )

  if (argv.diffDir) {
    // if a diff directory is specified we want to make sure it exists
    if (!fs.existsSync(argv.diffDir)) fs.mkdirSync(argv.diffDir)
    let left = path.join(argv.diffDir, "left")
    let right = path.join(argv.diffDir, "right")
    if (!fs.existsSync(left)) fs.mkdirSync(left)
    else cleanFolder(left);
    if (!fs.existsSync(right)) fs.mkdirSync(right)
    else cleanFolder(right);
  }

  Promise.all(libraries.map(compareLibrary)).then(() => {
    processedLibraries.forEach(logResults)
    logFinalResults()
    logSpacers(2)
  })
} else {
  throw new Error("Specify a config file with '--config' or create a '3parch.json' file in the working directory")
}
