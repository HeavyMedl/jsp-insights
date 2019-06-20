const fs = require('fs');
const mongoose = require('mongoose');
const Util = require('../utility/util');
const logger = require('../utility/logger')(
  {
    id: 'database.js'
  },
  'info'
);
const ShallowJSP = require('../models/shallow-jsp.model');
/**
 * Used to interact with the MongoDB.
 */
class Database {
  /**
   * Creates an instance of Database. Opens a connection to the
   * DATABASEURL.
   */
  constructor() {
    /**
     * The mongoDB URL
     * @type {String}
     */
    const DATABASEURL = 'mongodb://127.0.0.1/JSP';
    /**
     * The error log. Created by Util, appended to by this class.
     * @type {WriteStream}
     */
    // this.errorStream = fs.createWriteStream(Util.logOutput('error.log'), {
    //   flags: 'a',
    // });
    mongoose.connect(DATABASEURL);
    mongoose.Promise = global.Promise;
    this.db = mongoose.connection;
    this.db.on(
      'error',
      console.error.bind(console, 'MongoDB connection error:')
    );
  }

  /**
   * Generic function to insert a document into the database.
   *
   * @param {Object} options Contains the new data (obj) and it's
   *  appropriate Model to create a document to insert into the DB. Also
   *  contains any event handlers.
   * @return {Promise}
   * @memberof Database
   */
  insertDocument(options) {
    const document = new options.Model(options.obj);
    return new Promise((resolve, reject) => {
      document.save(error => {
        if (error) {
          logger.error('insertDocument: error inserting into DB', error);
          // this.errorStream.write(
          //   `insertDocument: error inserting into DB{error}\n`
          // );
          if (options.error) {
            options.error(error);
          }
        }
        if (options.callback) {
          options.callback(document);
        }
        resolve(document);
      });
    });
  }

  /**
   * General purpose function for removing documents
   * from the DB.
   *
   * @param {Object} query
   * @param {Object} model
   * @return {Promise}
   * @memberof Database
   */
  removeDocuments(query, model) {
    return new Promise((resolve, reject) => {
      model.remove(query, function(error) {
        if (error) {
          logger.error(error);
          reject();
        }
        resolve();
      });
    });
  }

  /**
   * Reads the 'shallow.json' file as a stream, inserting each object
   * as a JSP document in the JSP collection in the database.
   *
   * @return {Promise} Resolves when the JSP documents have loaded
   * @memberof Database
   */
  seedShallowJSPCollection() {
    return new Promise((resolve, reject) => {
      const inserts = [];
      logger.info('Dumping existing documents from JSP collection');
      this
        // Remove all documents from the JSP collection
        .removeDocuments({}, ShallowJSP)
        // Then load it up with the JSPObjects in shallow.json
        .then(model => {
          logger.info('Inserting JSPObject documents from shallow.json');
          Util.readStream({
            file: 'shallow.json',
            end: () => {
              Promise.all(inserts).then(() => {
                logger.info(
                  'seedShallowJSPCollection finished. Disconnecting from DB.'
                );
                this.db.close();
                resolve();
              });
            },
            onData: data => {
              logger.debug(
                'seedShallowJSPCollection onData',
                JSON.stringify(data, null, 2)
              );
              inserts.push(
                this.insertDocument({
                  obj: data,
                  Model: ShallowJSP,
                  callback: document => {
                    logger.verbose(`${document} inserted`);
                  }
                })
              );
            }
          });
        });
    });
  }
}

const db = new Database();
db.seedShallowJSPCollection();

module.export = Database;
