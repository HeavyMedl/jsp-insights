const mongoose = require('mongoose');

const Schema = mongoose.Schema;
/**
 * Model for the "shallow nest" JSP Object.
 */
const ShallowJSPSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    parent: {
      type: String,
      required: true
    },
    depth: {
      type: Number,
      required: true
    },
    nested: [
      {
        type: String,
        required: true
      }
    ]
    // variablesSet: {
    //   type: Schema.ObjectId,
    //   ref: 'Variables'
    // }
  },
  {
    // Collection name
    collection: 'ShallowJSP'
  }
);

ShallowJSPSchema.virtual('url').get(function() {
  return `/shallow-jsp/${this._id}`;
});

module.exports = mongoose.model('ShallowJSPSchema', ShallowJSPSchema);
