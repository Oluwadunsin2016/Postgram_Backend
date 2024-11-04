const express = require('express');
const { createPost, updatePost, getPosts, getPostDetails, toggleLikePost, toggleSavePost, deletePost, searchPost } = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../config/ImageUploadConfig');
const router = express.Router();

router.post('/create',authMiddleware,upload.single('file'), createPost);

// Route to update an existing post with optional image
router.put('/update/:postId', authMiddleware, upload.single('file'), updatePost);

// Route to fetch all posts of a specific user
// router.get('/user-posts/:userId', authMiddleware, getUserPosts);
router.get('/get-posts', authMiddleware, getPosts);

// Route to fetch details of a specific post with creator, likes, and saves
router.get('/details/:postId', authMiddleware, getPostDetails);
router.delete('/delete/:postId', authMiddleware, deletePost);
router.patch("/like/:postId", authMiddleware, toggleLikePost);
router.patch("/save-post/:postId", authMiddleware, toggleSavePost);
router.get("/search", authMiddleware, searchPost);

module.exports = router;
