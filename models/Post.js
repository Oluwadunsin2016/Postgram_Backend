const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  caption: { type: String, required: true },
  imageUrl: { type: String, default: null },
  location: { type: String, default: null },
  tags: [{ type: String }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
},
 { timestamps: true }
 );

module.exports = mongoose.model('Post', postSchema);
