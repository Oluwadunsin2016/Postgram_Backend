const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StreamChat } = require("stream-chat");
const { cloudinary } = require('../config/ImageUploadConfig');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// Stream API credentials
const apiKey = process.env.API_STREAM_KEY;
const apiSecret = process.env.API_SECRET;

// Initialize Stream Chat server client
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

exports.signup = async (req, res) => {
  try {
    const { password,name, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
     const initials = getInitials(name);
    const imageUrl = `https://api.dicebear.com/6.x/initials/svg?seed=${initials}`;
    const newUser = new User({ ...rest,name, password: hashedPassword,imageUrl});
               await newUser.save();
    res.status(201).json({message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error('Incorrect email');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Incorrect password');
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getLoggedInUser = async (req, res) => {
  try {
    res.status(200).json({ user:req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getUser = async (req, res) => {
  try {
       const { userId } = req.params;
    
    const user = await User.findById(userId).populate('posts').populate('saves');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find().select('-password');

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


function getInitials(name) {
  const initials = name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
  return initials;
}


exports.changeProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has an existing Cloudinary image URL
    if (user.imageUrl && user.imageUrl.includes('cloudinary.com')) {
      // Extract public ID from existing Cloudinary image URL
      const publicId = user.imageUrl.split('/').pop().split('.')[0];
      // Delete the existing image from Cloudinary
      await cloudinary.uploader.destroy(publicId);
    }

    // Upload the new image to Cloudinary from the file buffer
    cloudinary.uploader.upload_stream(
      {
        folder: 'Profile_Pictures', // Cloudinary folder
        public_id: `profile_${userId}`, // Set public ID based on user ID
        overwrite: true,
      },
      async (error, result) => {
        if (error) {
          // Return immediately to prevent further execution
          return res.status(500).json({ error: 'Error uploading to Cloudinary: ' + error.message });
        }

        // Update user's imageUrl with the new image URL
        user.imageUrl = result.secure_url;
        await user.save();

        // Send success response only once
        res.status(200).json({ message: 'Profile image updated successfully', user });
      }
    ).end(req.file.buffer); // Pass the file buffer to Cloudinary upload stream

  } catch (error) {
    // Ensure this error handler only triggers if there was no prior response
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};


exports.updateUser=async(req, res)=>{
try {
    const user = await User.findById(req.user._id).updateOne(req.body);
     res.status(200).json({ user, message:'user updated successfully'});
} catch (error) {
    res.status(500).json({ error: error.message });
}
}


// Follow a user
exports.followUser = async (req, res) => {
  try {
    const { userIdToFollow } = req.body;  // ID of the user you want to follow
    const currentUserId = req.user._id;   // The current logged-in user ID

    if (currentUserId.equals(userIdToFollow)) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    // Add user to following list
    const currentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { following: userIdToFollow } },
      { new: true }
    );

    // Add current user to followers list of the user to follow
    await User.findByIdAndUpdate(
      userIdToFollow,
      { $addToSet: { followers: currentUserId } }
    );

    res.json({ message: 'User followed successfully', currentUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    const { userIdToUnfollow } = req.body;
    const currentUserId = req.user._id;

    // Remove user from following list
    const currentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { following: userIdToUnfollow } },
      { new: true }
    );

    // Remove current user from followers list of the user to unfollow
    await User.findByIdAndUpdate(
      userIdToUnfollow,
      { $pull: { followers: currentUserId } }
    );

    res.json({ message: 'User unfollowed successfully', currentUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getToken=(req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const token = serverClient.createToken(userId); // Generate token
    return res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({ error: "Failed to generate token" });
  }
}

exports.getAvailableUsers = async (req, res) => {
  try {
    // Get all users from the database and exclude the password field
    const allUsers = await User.find().select('-password');

    // Get the current user's ID from the request query
    const { currentUserId } = req.query;

    if (!currentUserId) {
      return res.status(400).json({ error: 'Current user ID is required' });
    }

    // Filter out the current user
    const availableUsers = allUsers.filter((user) => {
      return user._id.toString() !== currentUserId; // Convert _id to string for comparison
    });

    res.status(200).json(availableUsers);
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};



exports.handleOpenMessage = async (req, res) => {
  const { user, creator } = req.body;

  try {
    console.log("Incoming data:", { user, creator });

    // 1. Extend the timeout for Stream API requests
    serverClient.axiosInstance.defaults.timeout = 10000; // Set timeout to 10 seconds
    console.log("Timeout set to 10 seconds");

    // 2. Ensure buyer and seller exist as Stream Chat users
    console.log("Before querying users");
    const existingUsers = await serverClient.queryUsers({
      id: { $in: [user?.id, creator?.id] },
    });
    console.log("Existing users:", existingUsers);

    const existingUserIds = existingUsers.users.map((u) => u.id);
    console.log("Existing users ids:", existingUserIds);

    const usersToCreate = [];
    if (!existingUserIds.includes(user?.id)) {
      usersToCreate.push(user);
    }
    if (!existingUserIds.includes(creator?.id)) {
      usersToCreate.push(creator);
    }

    if (usersToCreate.length > 0) {
      console.log("Creating users:", usersToCreate);
      await serverClient.upsertUsers(usersToCreate);
    }

    // 3. Check if a channel already exists with both users
    console.log("Checking for existing channel with both members");
    // const existingChannel = await serverClient.queryChannels({
    //   type: "messaging", // Specify channel type
    //  members: { $all: [user?.id, creator?.id] }, // Ensure both members are present
    // // member_count: 2, // Ensure the channel only contains these two members
    // });

    const userChannels = await serverClient.queryChannels({
  type: "messaging",
  members: { $in: [user?.id] },
});

console.log("userChannels:", userChannels);

const matchingChannel = userChannels.find((channel) => {
console.log("channel:", channel);
  const memberIds = channel?.members?.map((m) => m.user_id);
  return memberIds?.includes(user?.id) && memberIds?.includes(creator?.id) && memberIds?.length === 2;
});

if (!matchingChannel) {
  const channelId = `${user?.id}_${creator?.id}`.slice(0, 64);
  const channel = serverClient.channel("messaging", channelId, {
    name: `Conversation`,
    members: [user?.id, creator?.id],
    created_by_id: user?.id,
  });
  await channel.create();
  res.status(201).json({ channelId });
} else {
  res.status(200).json({ channelId: matchingChannel.id });
}

  } catch (error) {
    console.error("Error in messageSeller:", error.message);

    if (error.response) {
      console.error("Response data:", error.response.data);
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout occurred");
    }

    res.status(500).send("Server error");
  }
};
