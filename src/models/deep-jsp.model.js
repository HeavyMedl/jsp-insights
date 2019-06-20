const mongoose = require('mongoose');

const Schema = mongoose.Schema;
/**
 * Model for the "deep nest" JSP Object.
 */
const DeepJSPSchema = new Schema(
  {
    name: {
      type: 'String',
      required: true
    },
    path: {
      type: 'String',
      required: true
    },
    depth: {
      type: 'Number',
      required: true
    },
    parent: {
      type: 'String'
    },
    _nested: {
      type: ['String']
    },
    circular: {
      firstIncludedDepth: {
        type: 'Number'
      },
      lastIncludedBy: {
        path: {
          type: 'String'
        },
        depth: {
          type: 'Number'
        }
      }
    }
  },
  {
    // Collection name
    collection: 'DeepJSP'
  }
);

DeepJSPSchema.add({
  nested: [DeepJSPSchema],
  required: true
});

DeepJSPSchema.virtual('url').get(function() {
  return `/deep-jsp/${this._id}`;
});

module.exports = mongoose.model('DeepJSPSchema', DeepJSPSchema);
