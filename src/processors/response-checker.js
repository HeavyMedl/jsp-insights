const ProgressBar = require('progress');
const fs = require('fs');
const needle = require('needle');
const Util = require('../utility/util');
const ResponseObject = require('../objects/response-object.js');
const logger = require('../utility/logger')(
  {
    id: 'response-checker.js'
  },
  'verbose'
);
/**
 * Takes StrutsJSPObjects and tests whether or not a particular forward name
 * returns a non-404 response against a configurable set of domains.
 *
 * Requires ~../processor-output/struts.json for forward names
 */
class ResponseChecker {
  /**
   * Creates an instance of ResponseChecker.
   * @memberof ResponseChecker
   */
  constructor() {
    this.domains = [
      // Test against PROD
      'https://www.company.com',
      // Test against QA2
      'https://www-vqa2.company.com'
      // Test against DEV sandboxes.
      // 'https://wcs.company.com',
    ];
    /**
     * The StrutsJSPObjects' forward names' to make the requests against
     * @type {StrutsJSPObject[]}
     */
    this.strutsJSPObjects = [];
    /**
     * The array of response objects that get written to disk.
     * @type {ResponseObject[]}
     */
    this.responseObjects = [];
  }

  /**
   * Stream the struts.json file, for each StrutsJSPObject, make a HTTP GET
   * request to each domain in {@link this.domains} and report the HTTP
   * status code.
   *
   * @return {Promise}
   * @memberof ResponseChecker
   */
  makeRequestsToForwardNames() {
    logger.info(
      'makeRequestsToForwardNames:',
      'Making requests to all forward names in struts.json to',
      this.domains
    );
    this.strutsJSPObjects = require(Util.processorOutput('struts'));
    this.bar = new ProgressBar('[:bar] :rate/Requests/PS :percent :etas :n', {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: this.strutsJSPObjects.length * this.domains.length
    });
    return Promise.all(
      this.strutsJSPObjects.map((strutsJSPObject, i) => {
        return this.getRequest(strutsJSPObject);
      })
    ).then(responseObjects => {
      return Util.uniqueObjArray(responseObjects, 'forwardName');
    });
  }

  /**
   * For each domain, make a get request to the
   * {@link strutsJSPObject}.forwardName and report the HTTP status.
   *
   * @param {strutsJSPObject} strutsJSPObject
   * @return {Promise}
   * @memberof ResponseChecker
   */
  getRequest(strutsJSPObject) {
    // Need to split AccountInformationDesktopView/10851 for just
    // "AccountInformationDesktopView"
    const forwardName = strutsJSPObject.forwardName.split('/')[0] || '';
    return Promise.all(
      this.domains.map(domain => {
        return this._getRequest(forwardName, domain);
      })
    ).then(data => {
      const responseObject = new ResponseObject({
        forwardName: strutsJSPObject.forwardName,
        responses: data
      });
      return responseObject;
    });
  }

  /**
   * Makes the actual {@link forwardName} request to the {@link domain}.
   * If an error occurs, {@link retries} a fixed amount.
   *
   * @param {String} forwardName
   * @param {String} domain
   * @param {Number} retries
   * @return {Promise}
   * @memberof ResponseChecker
   */
  _getRequest(forwardName, domain, retries = 8) {
    return needle('get', `${domain}/${forwardName}`, {
      rejectUnauthorized: false,
      open_timeout: 15000,
      response_timeout: 15000,
      read_timeout: 15000,
      stream_length: 0
    })
      .then(response => {
        this.bar.tick({
          n: `${domain}/${forwardName}`
        });
        return {
          domain: `${domain}/${forwardName}`,
          responseStatusCode: response.statusCode
        };
      })
      .catch(err => {
        if (retries === 0) {
          this.bar.tick({
            n: `${domain}/${forwardName}`
          });
          const errorResponse = {
            error: err.stack.split('\n')[0] || '',
            domain: `${domain}/${forwardName}`,
            responseStatusCode: null
          };
          return errorResponse;
        }
        return this._getRequest(forwardName, domain, retries - 1);
      });
  }

  /**
   * Writes the response objects to disk
   *
   * @param {ResponseObject[]} responseObjects
   * @return {Promise}
   * @memberof MergeJSPObjects
   */
  writeResponseObjectsToDisk(responseObjects) {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        Util.processorOutput('response-objects.json'),
        JSON.stringify(responseObjects, null, 1),
        'utf8',
        err => {
          if (err) {
            reject(err);
          }
          logger.info(
            'writeResponseObjectsToDisk:',
            'Wrote response-objects.json to disk'
          );
          resolve(responseObjects);
        }
      );
    });
  }

  /**
   * The entry point for this class.
   *
   * @return {Promise}
   * @memberof ResponseChecker
   */
  execute() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    return this.makeRequestsToForwardNames().then(
      this.writeResponseObjectsToDisk.bind(this)
    );
  }
}
module.exports = ResponseChecker;
