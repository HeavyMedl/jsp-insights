const fs = require('fs');
const clone = require('clone');
const JSONStream = require('JSONStream');
const Util = require('../utility/util');
const CircularObject = require('../objects/circular-object');
const logger = require('../utility/logger')(
  {
    id: 'deep-nest.js'
  },
  'verbose'
);
/**
 * Turns a "shallow"y nested JSPObjects into "deep"ly nested
 * JSPObjects.
 */
class DeepNest {
  /**
   * Creates an instance of DeepNest.
   */
  constructor() {
    this.shallowJSPObjects = [];
    // this.shallowJson = fs.readFileSync('shallow.json', 'utf8');
    // console.log(this.shallowJson);
  }

  /**
   * The entry point for this class. For each JSPObject loaded
   * into memory from shallow-nest, perform the "deep nest" function
   * which recursively replaces each path (string) in the JSPObject.nested array
   * with its JSPObject representation.
   *
   * TODO: Think about moving away from loading the entirety of shallow-nest
   *  into memory and maybe into the DB and fallback on loading shallow.json
   *  from file.
   *
   * @param {Object} shallowJSPObjects
   * @memberof DeepNest
   */
  execute(shallowJSPObjects) {
    /**
     * Output deep.json file.
     * @type {TransformStream}
     */
    this.transformStream = JSONStream.stringify('[', ',', ']');
    this.transformStream.pipe(
      fs.createWriteStream(Util.processorOutput('deep.json'))
    );
    logger.info(
      'execute: Resolving nested children for each shallow JSP object.'
    );
    this.shallowJSPObjects = shallowJSPObjects;
    // console.log(this.shallowJSPObjects.length);
    for (let i = 0; i < this.shallowJSPObjects.length; i++) {
      const deepJSPObject = this.deepNest(this.shallowJSPObjects[i]);
      // this.transformStream.write(this.shallowJSPObjects[i]);
      // This MUST be stringified because JSONStream is having a hard time
      // parsing without it for some reason.
      this.transformStream.write(JSON.stringify(deepJSPObject, null, 1));
    }
    logger.info('execute: Wrote all deeply nested JSPObjects to deep.json.');
    this.transformStream.end();
  }

  /**
   * Uses the JSPObjects loaded in memory (ugh) from shallow-nest and performs
   * a linear search to find the JSPObject using the path. It also checks to
   * see if we have any circular references, attaching a CircularObject to the
   * JSPObject and emptying the nested array to short circuit an infinite loop.
   *
   * TODO: Replace linear search with binary search using path string as
   *  the ordering criteria
   * TODO: If shallow-nest JSPObjects were loaded into a DB, we could alleviate
   *  loading everything into memory here and just pick out the JSPObject by ID.
   *
   * @param {String} path
   * @param {Array} breadcrumbs
   * @return {Object} jspObj
   * @memberof DeepNest
   */
  getJSPObjectByPath(path, breadcrumbs) {
    let jspObj;
    for (let i = 0; i < this.shallowJSPObjects.length; i++) {
      // TODO: Should be enhanced with binary search instead of linear search.
      const currentJspObj = this.shallowJSPObjects[i];
      if (currentJspObj.path == path) {
        jspObj = clone(currentJspObj);
        jspObj.parent = breadcrumbs[breadcrumbs.length - 1] || undefined;
        const clonedBreadcrumbs = clone(breadcrumbs);
        clonedBreadcrumbs.pop();
        const firstIncludedDepth = clonedBreadcrumbs.indexOf(jspObj.path);
        // The first included depth number will tell us at what depth, relative
        // to the top-most level (0) and the child JSPObject this Circular
        // object is attached to, where this JSP object was first included
        // in the nested structure, which will identify the circular reference.
        if (firstIncludedDepth > -1) {
          jspObj._nested = jspObj.nested;
          // This will short-circuit the recursive call so we don't end up in a
          // infinite loop.
          jspObj.nested = [];
          jspObj.circular = new CircularObject({
            firstIncludedDepth,
            lastIncludedBy: {
              path: breadcrumbs[breadcrumbs.length - 1] || undefined,
              depth: breadcrumbs.length - 1 || undefined
            }
          });
        }
      }
    }
    return jspObj;
  }

  /**
   * Gets the JSPObject in the nested array using the path as a key
   *
   * @param {Object} jspObject
   * @param {Array} breadcrumbs
   * @param {Number} depth
   * @return {Object} jspObject
   * @memberof DeepNest
   */
  getResolvedJSPObject(jspObject, breadcrumbs, depth) {
    const nested = [];
    for (let i = 0; i < (jspObject.nested || []).length; i++) {
      const jspObj = this.getJSPObjectByPath(jspObject.nested[i], breadcrumbs);
      if (typeof jspObj !== 'undefined') {
        jspObj.depth = depth;
        nested.push(jspObj);
      }
    }
    jspObject.nested = nested;
    return jspObject;
  }

  /**
   * Iteratively walks the "nested" property (array) of a JSPObject,
   * Replacing each file path reference in the nested array
   * with its JSPObject representation, it then recurses the replaced
   * JSPObject's nested array until it cannot find any more nested
   * JSPObjects.
   *
   * @param {Object} jspObject The JSPObject
   * @param {Array} breadcrumbs Array of files
   * @param {Number} depth What depth is this JSPObject in
   *  relation to top level
   * @return {Object} JSPObject
   * @memberof DeepNest
   */
  deepNest(jspObject, breadcrumbs, depth) {
    depth = (depth || 0) + 1;
    breadcrumbs = Array.isArray(breadcrumbs) ? breadcrumbs : [];
    breadcrumbs.push(jspObject.path);
    const jspObj = this.getResolvedJSPObject(
      clone(jspObject),
      breadcrumbs,
      depth
    );
    for (let i = 0; i < jspObj.nested.length; i++) {
      if (jspObj.nested[i].nested.length > 0) {
        // breadcrumbs.push(jspObj.path);
        jspObj.nested[i] = this.deepNest(jspObj.nested[i], breadcrumbs, depth);
        breadcrumbs.pop();
      }
      if (i == jspObj.nested.length - 1) {
        breadcrumbs = [];
      }
    }
    return jspObj;
  }
}
module.exports = DeepNest;
