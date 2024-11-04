const express = require('express');
const { signup, login, getUsers, changeProfileImage, getUser, getLoggedInUser, updateUser, unfollowUser, followUser } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../config/ImageUploadConfig');
const router = express.Router();    

router.post('/signup', signup);
router.post('/login', login);
router.get('/get-user',authMiddleware, getLoggedInUser);
router.put('/update-user',authMiddleware, updateUser);
router.get('/get-profile/:userId',authMiddleware, getUser);
router.get('/get-users',authMiddleware, getUsers);
router.put('/:userId/profile-image',upload.single('file'), changeProfileImage);
router.post('/follow', authMiddleware, followUser);
router.post('/unfollow', authMiddleware, unfollowUser);

module.exports = router;
