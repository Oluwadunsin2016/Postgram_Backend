const express = require('express');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5174',credentials:true })); // Replace with your React app’s origin
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use('/api/user', userRoutes);
app.use('/api/post', postRoutes);
app.use("/",(req,res)=>{
res.json({
  message:"sucess"
})
})

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message); // Log the error for debugging
  res.status(500).send("Internal Server Error");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
// console.log(require('crypto').randomBytes(10).toString('hex'));
  console.log(`Server running on port ${PORT}`);
});
