var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    if (req.session.authorized == true) {
        res.render('siteHome');
    } else {
        res.redirect('/app/login');
    }
});

module.exports = router;