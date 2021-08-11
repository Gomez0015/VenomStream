var express = require('express');
var router = express.Router();
const Users = require('./models/userModel.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/* GET users listing. */
router.get('/', function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;
    res.render('login', { themeColor: req.session.themeColor });
});


router.post('/', async function(req, res, next) {
    var sess = req.session;
    if (req.body.login != undefined) {
        const user = await Users.findOne({ username: req.body.username });
        if (user != null) {
            bcrypt.compare(req.body.password, user.password, async function(err, result) {
                if (result) {
                    sess.username = user.username;
                    sess.favorites = user.favorites;
                    req.session.authorized = true;
                    res.redirect('/app/');
                } else {
                    res.render('login', { info: "Wrong Password" });
                }
            });
        } else {
            res.render('login', { info: "Wrong username" });
        }
    }
});

module.exports = router;