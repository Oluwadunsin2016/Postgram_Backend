const { cloudinary } = require("../config/ImageUploadConfig");
const Post = require("../models/Post");
const User = require("../models/User");

exports.createPost = async (req, res) => {
  try {
    const { caption, location, tags, userId } = req.body;
    const file = req.file;

    let imageUrl = null;
    const tagsArray = typeof tags === "string" ? tags.split(",") : tags;

    // Upload image if provided
    if (file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "Post_Images" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(file.buffer);
      });
      imageUrl = result.secure_url;
    }

    // Create the post with or without the image URL
    const post = new Post({
      caption,
      location,
      imageUrl,
      tags: tagsArray,
      creator: userId,
    });

    await post.save();

    // Add the post to the user's posts array
    await User.findByIdAndUpdate(userId, { $push: { posts: post._id } });

    res.status(201).json({ message: "Post created successfully", post });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption, location, tags } = req.body;
    const file = req.file;
    const tagsArray = typeof tags === "string" ? tags.split(",") : tags;

    // Find the existing post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Initialize newImageUrl as the current imageUrl in case no new image is provided
    let newImageUrl = post.imageUrl;

    // Handle Cloudinary image update if a new file is provided
    if (file) {
      // Delete previous Cloudinary image if it exists
      if (post.imageUrl && post.imageUrl.includes("cloudinary.com")) {
        // Extract the publicId (ensuring folder is accounted for)
        const publicId = post.imageUrl.split('/').slice(-2).join('/').split('.')[0];

        // Delete the previous image from Cloudinary
        await cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error("Error deleting image from Cloudinary:", error.message);
            throw new Error("Could not delete previous image from Cloudinary");
          }
        });
      }

      // Upload the new image to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "Post_Images" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(file.buffer);
      });

      newImageUrl = result.secure_url;
    }

    // Update the post fields
    post.caption = caption || post.caption;
    post.location = location || post.location;
    post.tags = tagsArray || post.tags;
    post.imageUrl = newImageUrl;

    const updatedPost = await post.save();
    res.status(200).json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getPosts = async (req, res) => {
  try {
    // Get page and limit from query parameters, set defaults if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch posts with pagination, populate user and likes
    const posts = await Post.find()
      .skip(skip)
      .limit(limit)
      .populate("creator", "-password")
      .populate("likes", "-password");

    // Get the total number of posts to calculate if there are more pages
    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    if (!posts) {
      return res.status(404).json({ error: "Posts not found" });
    }

    res.status(200).json({ posts, hasMore });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPostDetails = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate("creator","-password").populate("likes");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete the post from Cloudinary if it has an image
    if (post.imageUrl && post.imageUrl.includes('cloudinary.com')) {
      const publicId = post.imageUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete the post from the database
    await Post.deleteOne({ _id: postId })

    // Remove the post from all users' saved posts
    // await User.updateMany(
    //   { saves: postId },
    //   { $pull: { saves: postId } }
    // );
    await User.updateMany(
      { $or: [{ saves: postId }, { posts: postId }] }, // Match users where postId is in either array
      { $pull: { saves: postId, posts: postId } } // Remove postId from both saves and posts
    );

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id; // Assuming user ID is available from authentication middleware

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already liked the post
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike the post by removing the user ID
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      // Like the post by adding the user ID
      post.likes.push(userId);
    }

    // Save the post
    await post.save();

    res.status(200).json({ message: isLiked ? "Post unliked" : "Post liked", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id; // Assuming user ID is available from authentication middleware

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has already saved the post
    const isSaved = user.saves.includes(postId);

    if (isSaved) {
      // Unsave the post by removing the post ID
     user.saves = user.saves.filter((id) => id.toString() !== postId.toString());
    } else {
      // Save the post by adding the post ID
     user.saves.push(postId);
    }

    // Save the post
    await user.save();

    res.status(200).json({ message: isSaved ? "Post saved" : "Post removed", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchPost=async (req, res) => {
  try {
    const { term } = req.query;
    const posts = await Post.find({
      $or: [
        { caption: { $regex: term, $options: 'i' } }, // Case-insensitive search
        { location: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } }
      ]
    }).limit(10).populate("creator","-password").populate("likes"); // Limit results for performance
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

