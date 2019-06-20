/**
 * Plain ol' JavaScript object representing the git statistics for this
 * particular JSP.
 */
class GitJSPObject {
  /**
   * Creates an instance of GitJSPObject.
   * @param {Object} obj The object containing git information about the
   *  JSP.
   */
  constructor(obj) {
    // this.filePath = obj.filePath;
    // this.label = obj.label;
    this.relativeTime = obj.relativeTime;
    this.iso8601 = obj.iso8601;
    this.commitHash = obj.commitHash;
    this.author = obj.author;
    this.commitMessage = obj.commitMessage;
  }
}
module.exports = GitJSPObject;
