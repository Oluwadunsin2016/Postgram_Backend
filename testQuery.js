const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust the path to your User model
require('dotenv').config();

// Replace with your MongoDB connection string

async function testRemovePostFromSaves() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const postId = "67214f0f4393b1a9a7f7bb60"; // Replace with the ID of the post you want to remove from saves

    // Run the updateMany query in isolation
    const updateResult = await User.updateMany(
      { posts: postId },
      { $pull: { posts: postId } }
    );

    // Log the results
    console.log("Update Result:", updateResult);

    // Optionally, verify the change
    const updatedUsers = await User.find({ posts: postId });
    console.log("Users with post (should be empty):", updatedUsers);

    // Close the MongoDB connection
    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    mongoose.connection.close();
  }
}

testRemovePostFromSaves();
