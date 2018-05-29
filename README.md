# 3parch

A **3**rd **PAR**ty **CH**ecker CLI to compare included/embedded 3rd party libraries against their origins

##Installation

As of this commit 3parch isn't on npm, so the best way to install is to simply download the source. After you've done this run `npm install` for the necessary libraries.

To make 3parch available globally for you you can run `npm link` in the project directory. That should make 3parch globally available and allow you to use the `3parch` command from any directory you wish.

##Usage

In order to use 3parch you'll need to create a JSON file that will specify the details of the 3rd party libraries. The JSON should look like this:

```
[{
  "library": "d3",
  "version": "4.8.0",
  "purpose": "visualizations",
  "projectPage": "https://github.com/d3",
  "source": "https://unpkg.com/d3@4.8.0/build/d3.min.js",
  "location": "./static/d3v4.min.js"
},
{
  "library": "venn.js",
  "version": "0.2.14",
  "purpose": "visualisation",
  "projectPage": "https://github.com/benfred/venn.js/",
  "modified": true,
  "modificationReason": "better integration with qlik modules",
  "source": "https://unpkg.com/venn.js@0.2.14/build/venn.js",
  "location": "./main-extension.js",
  "offset": 333113,
  "length": 71757
}]
```

- **library:** The name of the 3rd party library
- **version:** The version of the 3rd party library being used
- **purpose:** The reason for using the library
- **projectPage:** The main page for the 3rd party library
- **modified:** Whether or not the source code has been modified
- **modificationReason:** Why was the original source modified
- **source:** The url to the original source file being used
- **location:** The location of the local file being loaded
- **offset**: If the source of the 3rd party library is embedded into a file, where does the source begin
- **length**: If the source of the 3rd party library is embedded into a file, what is the length of the source to compare

Once you have your JSON file you can run 3parch as follows:

`3parch --config config.json`

The following commands are also available:

- `-w, --working` - Specify what directory to work out when running 3parch.
- `-d, --diff-dir` - If specified, 3parch will output modified libraries or failed comparisons to the path given. 3parch will create a `left` directory containing the original source and a `right` directory containing the local source.
- `-v, --verbose` - More detail will be output when running 3parch.

## Example

The following command will run 3parch using the `config.json` as a reference for the 3rd party libraries. It will look for source files given in the `location` properties of the `config.json` file in the `~/src/my-extension` directory. If any comparisons fail or are marked as modified, the downloaded source will be placed in `~/src/my-extension/3parch/left` and a copy of the local source will be placed in `~/src/my-extension/3parch/right`.

`3parch --config config.json --working ~/src/my-extension --diff-dir ~/src/my-extension/3parch`
