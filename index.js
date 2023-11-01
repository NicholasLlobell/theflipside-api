require('dotenv').config()
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment')
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const isAuthenticated = require('./middleware/isAuthenticated')
const fileUploader = require('./middleware/cloudinary')

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;

app.use(cors({credentials:true, origin: process.env.REACT_APP_URI}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect(process.env.MONGODB_URI)
.then((x) => {
  console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`);
})
.catch((err) => {
  console.error("Error connecting to mongo: ", err);
});

app.post('/register', async (req,res) => {
  const {username,password} = req.body;
  try{
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt),
    });
    res.json(userDoc);
  } catch(e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  console.log("this is the user doc", userDoc)
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      const { _id, username } = userDoc;
          
      // Create an object that will be set as the token payload
      const payload = { _id, username };

      // Create and sign the token
      const authToken = jwt.sign( 
        payload,
        process.env.SECRET,
        { algorithm: 'HS256', expiresIn: "6h" }
      );

      // Send the token as the response
        res.status(200).json({ authToken: authToken, user: payload });
      } else {
        res.status(400).json('NARC SHARK 🦈 TRY AGAIN')
      }
    // logged in
  } else {
    res.status(400).json('NARC SHARK 🦈 TRY AGAIN');
  }
});

app.get('/profile', isAuthenticated, (req,res) => {
  res.json(req.user)
});

// app.post('/logout', (req,res) => {
//   res.cookie('token', '').json('ok');
// });

app.post('/post',  async (req,res) => {
console.log("REQ.BODY ===>", req.body)
try {
  const {title,summary,content,author, files} = req.body;
  const postDoc = await Post.create({
    title,
    summary,
    content,
    cover: files,
    author
  });
  res.json(postDoc);

} catch(err) {
  console.log(err)
  res.json(err)
}


});

app.put('/post', isAuthenticated, async (req,res) => {

  try {
    const {id,title,summary,content, files} = req.body;
    const postDoc = await Post.findById(id);
    console.log("This is postDoc", postDoc)

    const isAuthor = postDoc.author.toString() === req.user._id.toString();
    console.log("isAuthor check", isAuthor)
    if (!isAuthor) {
      return res.status(400).json('SUS SHRIMP 🦐 YOU ARE NOT THE AUTHOR');
    } else {
  
      let updated = await Post.findByIdAndUpdate(id, {
        title,
        summary,
        content,
        cover: files,
      }, {new: true});
  
      res.json(updated);
    }

  } catch(err) {
    console.log(err)
    res.json(err)
  }


});

app.get('/post', (req, res, next) => {
  Post.find()
  .populate('author')
  .sort({createdAt: -1})
  .then((foundPosts) => {
    console.log("these are the found posts", foundPosts)
    res.json(foundPosts)
  })
  .catch((err) => {
    console.log(err)
    res.json(err)
  })
})

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']).populate({path: 'comments', populate: {path: 'author'}})
  res.json(postDoc);
})

app.post('/new-comment/:postId', isAuthenticated, (req, res, next) => {

  Comment.create({
    comment: req.body.comment,
    author: req.user._id
  })
  .then((createdComment) => {
    console.log("this is createdComment", createdComment)
    Post.findByIdAndUpdate(
      req.params.postId,
      {
        $push: {comments: createdComment._id}
      },
      {new: true}
    )
    .then((toPopulate) => {
      return toPopulate.populate('author', ['username'])
    })
    .then((populated) => {
      console.log("This is after populated", populated)
      return populated.populate({path: 'comments', populate: {path: 'author'}})      
    })
    .then((final) => {
      console.log("final populate", final)
      res.json(final)
    })
    .catch((err) => {
      console.log(err)
      res.json(err)
    })
  })
  .catch((err) => {
    console.log(err)
    res.json(err)
  })

})

app.post('/new-photo', fileUploader.single("image"), (req, res, next) => {
  if (!req.file) {
    next(new Error("No file uploaded!"));
    return;
  }
  console.log("this is file", req.file)
  res.json({ image: req.file.path });
})

app.listen(process.env.PORT, () => {
  console.log("Server up and running! On " + process.env.PORT)
});
// mongodb+srv://flipside:oL53dT0VwhYzcFxE@cluster0.oygqebr.mongodb.net/?retryWrites=true&w=majority
// oL53dT0VwhYzcFxE