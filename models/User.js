const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, default: null },
  username: { type: String, default: null },
  imageUrl: { type: String, default: null },
  bio: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], 
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
},
 { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
