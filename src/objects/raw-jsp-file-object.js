/**
 * Plain ol' JavaScript object representing the JSP file as it was read
 * by the system.
 */
class RawJSPFileObject {
  /**
   * Creates an instance of RawJSPFileObject.
   * @param {Object} fileObj The object containing components of the
   *  JSP file object.
   */
  constructor(fileObj) {
    /**
     * The stats for this JSP file, read by the system.
     * @type {Object}
     */
    this.fileStats = fileObj.fileStats;
    /**
     * The root directory for this JSP
     * @type {String}
     */
    this.root = fileObj.root;
    /**
     * The path of the JSP
     * @type {String}
     */
    this.filePath = fileObj.filePath;
  }
}
module.exports = RawJSPFileObject;

// Example:
// {
//   "fileStats": {
//     "dev": 16777220,
//     "mode": 33188,
//     "nlink": 1,
//     "uid": 2011240751,
//     "gid": 1536532493,
//     "rdev": 0,
//     "blksize": 4096,
//     "ino": 8606567905,
//     "size": 2824,
//     "blocks": 8,
//     "atimeMs": 1542153142047.2783,
//     "mtimeMs": 1536878097169.9968,
//     "ctimeMs": 1536878097169.9968,
//     "birthtimeMs": 1536878097169.9216,
//     "atime": "2018-11-13T23:52:22.047Z",
//     "mtime": "2018-09-13T22:34:57.170Z",
//     "ctime": "2018-09-13T22:34:57.170Z",
//     "birthtime": "2018-09-13T22:34:57.170Z",
//     "name": "AjaxActionErrorResponse.jsp",
//     "type": "file"
//   },
//   "root": "../Stores/WebContent",
//   "filePath": "../Stores/WebContent/AjaxActionErrorResponse.jsp"
// }
