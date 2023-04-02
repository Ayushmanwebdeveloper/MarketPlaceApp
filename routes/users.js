const express = require("express");
const router = express.Router();
const { User } = require("../models/user");
const { auth } = require("../middleware/auth");

router.post("/register", (req, res) => {
  const user = new User(req.body);
  user.save((err, userInfo) => {
    if (err)
      return res.json({
        success: false,
        err,
      });
    return res.status(200).json({
      success: true,
    });
  });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "Account with this Email Address seems to does not exist",
      });
    }
   
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch) {
        return res.json({
          loginSuccess: false,
          message: "Incorrect password.",
        });
      }
     
      user.generateToken((err, user) => {
        if (err) {
          return res.status(400).send(err);
        }
        res.cookie("x_authExp", user.tokenExp);
        res.cookie("x_auth", user.token).status(200).json({
          loginSuccess: true,
          userId: user._id,
        });
      });
    });
  });
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "", tokenExp: "" }, (err, user) => {
    if (err) {
      return res.json({ success: false, err });
    }
    return res.status(200).send({ success: true });
  });
});

router.get("/stripe_auth", auth, (req, res) => {
  User.findOne({ _id: req.user._id }, (err, user) => {
    request({
      url: "https://connect.stripe.com/oauth/token",
      method: "POST",
      json: true,
      body: {client_secret:config.stripe_test_secret_key,code:req.body.stripe, grant_type:'authorization_code'}
    }, async (error, response, body) => {
      //update user
      if(body.error){
        return res.status('400').json({
          error: body.error_description
        })
      }
      
      try {
        let user = user
        user.stripe_seller = body
        user.updated = Date.now()
        await user.save()
        user.token = undefined
        res.json(user)
      } catch (err) {
        return res.status(400).json({
          error: errorHandler.getErrorMessage(err)
        })
      }
    })
});
});
router.get("/auth", auth, (req, res) => {
 res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
  });
});



module.exports = router;