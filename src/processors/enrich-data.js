const fs = require('fs');
const JSONStream = require('JSONStream');
const Util = require('../utility/util');
const logger = require('../utility/logger')(
  {
    id: 'enrich-data.js'
  },
  'verbose'
);
/**
 * Reads the JSON file built by `shallow-nest.js` as a stream, produces data
 * about each file, and then writes a finalized JSON used downstream.
 */
class EnrichData {
  /**
   * [constructor description]
   */
  constructor() {
    /**
     * The error log. Created by Util, appended to by this class.
     * @type {WriteStream}
     */
    // this.errorStream = fs.createWriteStream(Util.logOutput('error.log'), {
    //   flags: 'a',
    // });
  }

  /**
   * [reportNestedJSPs description]
   * @param  {[type]} jsps       [description]
   * @param  {[type]} parentPath [description]
   * @return {void}            [description]
   */
  reportNestedJSPs(jsps, parentPath) {
    if (jsps.length > 0) {
      jsps.forEach(jsp => {
        logger.debug(`Reading: ${JSON.stringify(jsp, null, 2)}`);
        try {
          const data = fs.readFileSync(jsp, 'utf8');
        } catch (e) {
          logger.error(`${e}`);
          logger.error(`Parent: ${parentPath}`);
          // this.errorStream.write(`${e}\n`);
          // this.errorStream.write(`Parent: ${parentPath}\n`);
          // this.errorStream.write(`-------------------------------\n`);
        } finally {
          if (jsp.includes('${')) {
            this.substitutes.push(jsp);
          }
        }
      });
    }
  }

  /**
   * Performs the operation of enriching a JSPObject with meta data.
   * @param  {JSPObject} jspObject
   * @return {void}
   */
  enrich(jspObject) {
    logger.info(jspObject);
  }

  /**
   * Entry point for this class.
   * @return {void}
   */
  execute() {
    return new Promise((resolve, reject) => {
      this.transformStream = JSONStream.parse('*');
      this.inputStream = fs.createReadStream('shallow.json');
      this.inputStream
        .pipe(this.transformStream)
        // Each "data" event will emit one item in our record-set.
        .on('data', this.enrich)
        // Once the JSONStream has parsed all the input, let's indicate done.
        .on('end', () => {
          logger.info('JSONStream parsing complete!');
          resolve();
        });
    });
  }
}
module.exports = EnrichData;
