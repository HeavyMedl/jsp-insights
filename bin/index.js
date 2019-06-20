#!/usr/bin/env node

/**
 * Project TODOs
 *
 * 1. Include a "parents" array in JSPObject that is a list of JSP(F) paths
 *  representing who included this JSP (JSPObject). Probably in shallow-nest.js.
 * 2. For JSPs who have only a struts entry and no tiles definition, make
 *  a HTTP request to several lower environments (DEV, QA) and PROD to confirm
 *  if the forward name actually resolves to the forward path.
 * 3. Variables set hierarchy. This could be its own json file that could be
 *  referened later by other features.
 * 4. Generate a HTML report with a few graphs showing the state of the number
 *  of JSPs in the repo. Might need to think about generating a reports.json
 *  that can support the metrics we're interested in. Maybe a living report
 *  that just adds new nodes for each run (to show differences between runs).
 * 5. REST API for fetching JSP data from a MongoDB seeded with the data
 *  exported to processor-output/*
 * 6. README explaining what the hell is going on with this project.
 * 7. Export documentation to team site repo.
 */
const program = require('commander');
const ShallowNest = require('../src/processors/shallow-nest');
const DeepNest = require('../src/processors/deep-nest');
const Tiles = require('../src/processors/tiles');
const Struts = require('../src/processors/struts');
const ResponseChecker = require('../src/processors/response-checker');
const GitJSPObjects = require('../src/processors/git-jsp-objects');
const MergeJSPObjects = require('../src/processors/merge-jsp-objects');
const Sheets = require('../src/processors/sheets');
const FileRemover = require('../src/processors/file-remover');
const Util = require('../src/utility/util');

const shallowNest = new ShallowNest();
const deepNest = new DeepNest();
const tiles = new Tiles();
const struts = new Struts();
const responseChecker = new ResponseChecker();
const mergeJSPObjects = new MergeJSPObjects();
const version = require('../package.json').version;

const asciiTitle = `JSP Insights CLI ${version}`;

const repoPath = require('path').resolve(__dirname, '../../../');

program
  .command('raw')
  .description(
    `Writes ../processor-output/jsp.json. ` +
      'Represents files with .jsp or .jspf extension ' +
      'derived from the Stores project'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile);
  });

program
  .command('git')
  .description(
    `Writes ../processor-output/git-jsp-objects.json. ` +
      'Takes the output of several "git log <file>" commands, builds an ' +
      'object then outputs to the git-jsp-objects.json file. Requires a ' +
      'git repo and jsp.json to be built.'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Gets the last modified and created logs for each RawJSPFileObject.
      .then(rawJSPFileObjects => {
        const gitJSPObjects = new GitJSPObjects(repoPath);
        return gitJSPObjects.execute(rawJSPFileObjects);
      });
  });

program
  .command('shallow')
  .alias('sh')
  .description(
    `Writes ../processor-output/shallow.json whose ` +
      'objects represents each JSP(F) and its first ' +
      'level of nested JSP(F)s (within Stores project).'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Generates shallow.json
      .then(shallowNest.execute.bind(shallowNest));
  });

program
  .command('deep')
  .alias('dp')
  .description(
    `Writes ../processor-output/deep.json whose ` +
      'input are shallow nested JSPObjects. The output is an array of ' +
      'deeply nested JSPObjects, whose nested paths have been replaced by ' +
      'objects representing their children, until we have no more nesting.'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Generates shallow.json and passes all shallow JSPObjects to deepNest
      .then(shallowNest.execute.bind(shallowNest))
      // Generates deep.json using shallow JSPObjects
      .then(deepNest.execute.bind(deepNest));
  });

program
  .command('tiles')
  .alias('tls')
  .description(
    `Writes ../processor-output/tiles.json. ` +
      'Creates TilesJSPObjects to inform the client about attributes of ' +
      'each JSP (which tiles - def derived, is top level or nested, etc.).'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Generates shallow.json and passes all shallow JSPObjects to deepNest
      .then(shallowNest.execute.bind(shallowNest))
      // Generates deep.json using shallow JSPObjects
      .then(deepNest.execute.bind(deepNest))
      // Generates tiles.json by first pulling the top level JSPs from
      // each of the tiles files defined by Util.TILES, then reads the
      // deep.json file to pull all nested JSPs.
      .then(tiles.execute.bind(tiles));
  });

program
  .command('struts')
  .alias('str')
  .description(
    `Writes ../processor-output/struts.json. ` +
      'Creates StrutsJSPObjects to inform the client about attributes of ' +
      'each JSP (which struts XML, forward name, forward path its ' +
      'associated with).'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Generates shallow.json and passes all shallow JSPObjects to deepNest
      .then(shallowNest.execute.bind(shallowNest))
      // Generates deep.json using shallow JSPObjects
      .then(deepNest.execute.bind(deepNest))
      // Generates tiles.json by first pulling the top level JSPs from
      // each of the tiles files defined by Util.TILES, then reads the
      // deep.json file to pull all nested JSPs.
      .then(tiles.execute.bind(tiles))
      // Generates struts.json by first pulling the top level JSPs from
      // each of the struts XML files in Stores/WEB-INF, then reads the
      // deep.json file to pull all nested JSPs.
      .then(struts.execute.bind(struts));
  });

program
  .command('response')
  .alias('rsp')
  .description(
    `Writes ../processor-output/response-objects.json. ` +
      'Takes StrutsJSPObjects and tests whether or not a particular ' +
      'forward name returns a non-404 response against a configurable ' +
      'set of domains.'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Generates shallow.json and passes all shallow JSPObjects to deepNest
      .then(shallowNest.execute.bind(shallowNest))
      // Generates deep.json using shallow JSPObjects
      .then(deepNest.execute.bind(deepNest))
      // Generates tiles.json by first pulling the top level JSPs from
      // each of the tiles files defined by Util.TILES, then reads the
      // deep.json file to pull all nested JSPs.
      .then(tiles.execute.bind(tiles))
      // Generates struts.json by first pulling the top level JSPs from
      // each of the struts XML files in Stores/WEB-INF, then reads the
      // deep.json file to pull all nested JSPs.
      .then(struts.execute.bind(struts))
      // Takes StrutsJSPObjects and tests whether or not a particular
      // forward name returns a non - 404 response against a configurable
      // set of domains.
      .then(responseChecker.execute.bind(responseChecker));
  });

program
  .command('merge-all')
  .alias('ma')
  .description(
    `Writes ../processor-output/merged-jsp-objects.json. ` +
      'Merges a RawJSPFileObject with its TilesJSPObject, StrutsJSPObject, ' +
      'GitJSPObject, and ResponseObject compliments, given they exist.'
  )
  .option(
    '-no-git, --no-git',
    'Exclude fetching git logs for each JSP(F)',
    false
  )
  .option(
    '-no-requests, --no-requests',
    'Exclude fetching HTTP responses of struts forward names.',
    false
  )
  .option(
    '--sheets',
    'Update a spreadsheet derived from merged-jsp-objects',
    false
  )
  .option(
    '--report',
    'Create a reports.json (or add to an existing reports.json) ' +
      'representing metadata from this command.',
    false
  )
  .option(
    '--clear-report',
    'Clears previously aggregated reports, starting fresh with this run',
    false
  )
  .action(cmd => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(Util.getRawJSPFileObjects.bind(Util, cmd.report, cmd.clearReport))
      // Writes the raw jsp file objects to jsp.json
      .then(Util.writeJSPFileObjectsToFile)
      // Gets the last modified and created logs for each RawJSPFileObject.
      .then(rawJSPFileObjects => {
        if (cmd.git) {
          const gitJSPObjects = new GitJSPObjects(repoPath);
          return gitJSPObjects.execute(rawJSPFileObjects);
        }
        // --no-git was passed.
        return {
          rawJSPFileObjects
        };
      })
      // Generates shallow.json and passes all shallow JSPObjects to deepNest
      .then(data => {
        return shallowNest.execute(data.rawJSPFileObjects);
      })
      // Generates deep.json using shallow JSPObjects
      .then(deepNest.execute.bind(deepNest))
      // Generates tiles.json by first pulling the top level JSPs from
      // each of the tiles files defined by Util.TILES, then reads the
      // deep.json file to pull all nested JSPs.
      .then(tiles.execute.bind(tiles, cmd.report))
      // Generates struts.json by first pulling the top level JSPs from
      // each of the struts XML files in Stores/WEB-INF, then reads the
      // deep.json file to pull all nested JSPs.
      .then(struts.execute.bind(struts, cmd.report))
      // Takes StrutsJSPObjects and tests whether or not a particular
      // forward name returns a non - 404 response against a configurable
      // set of domains.
      .then(data => {
        return cmd.requests ? responseChecker.execute() : data;
      })
      // Merges the JSPObjects with there TilesJSPObject and StrutsJSPObject
      // compliments, given they exist.
      .then(mergeJSPObjects.execute.bind(mergeJSPObjects, cmd.report))
      // If we pass --sheets, we want to write to sheets.
      .then(data => {
        if (cmd.sheets) {
          return new Sheets(Util.SPREADSHEET_ID).execute();
        }
        return data;
      })
      // If we're generating a report, let's copy the reports.json to
      // the site _data directory.
      .then(data => Util.copyReportsToSiteData(data, cmd.report))
      // If we're generating a report, let's create unique report HTML
      // for each report in reports.json.
      .then(data => Util.createReportsHTML(data, cmd.report))
      // If there are any derps, herp derp.
      .catch(reason => logger.error(reason));
  });

program
  .command('sheets')
  .description(
    'Updates a specified Google spreadsheet with metadata for' +
      ' each JSP. Requires merged-jsp-object.json (jsp merge-all).'
  )
  .action(() => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(data => {
        return new Sheets(Util.SPREADSHEET_ID).execute();
      });
  });

program
  .command('remove')
  .description(
    'Removes JSPs from version control based on low point value. ' +
      'Requires merged-jsp-object.json (jsp merge-all).'
  )
  .option(
    '--audit',
    'Will not remove anything. Just writes audited-objects.json' +
      ' to be reviewed before removing.',
    false
  )
  .option(
    '--staging-scriptlet',
    'Takes the curated list of JSP(F)s ready for' +
      'removal and appends a hardcoded scriptlet to it to allow Splunk to ' +
      'gather any JSP(F)s that were wrongly idenfitied as unused by' +
      'JSP Insights CLI tool.',
    false
  )
  .option(
    '--remove-staging-scriptlet',
    'Removes the scriptlet tag appended to the curated list of JSP(F)s ready' +
      'for removal.',
    false
  )
  .action(cmd => {
    Util.ascii(asciiTitle)
      // jsp.json is a dependency for this command.
      .then(data => {
        const fileRemover = new FileRemover(repoPath);
        const sheets = new Sheets(Util.SPREADSHEET_ID, Util.AUDIT_SHEET_ID);
        if (cmd.audit) {
          return fileRemover.executeAudit().then(sheets.audit.bind(sheets));
        }
        if (cmd.stagingScriptlet) {
          return fileRemover.executeStagingScriptlet();
        }
        if (cmd.removeStagingScriptlet) {
          return fileRemover.executeRemoveStagingScriptlet();
        }
        return fileRemover.execute().then(sheets.audit.bind(sheets));
      });
  });

program.version(version, '-v, --version');

// allow commander to parse `process.argv`
program.parse(process.argv);

if (program.args.length === 0) {
  Util.ascii(asciiTitle).then(() => program.help());
}
