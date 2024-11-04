const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
},
 { timestamps: true }
 );

module.exports = mongoose.model('Save', saveSchema);
