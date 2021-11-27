var createError = require('http-errors');
var express = require('express');
var session = require('express-session')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var appindexRouter = require('./routes/appIndex');
var apploginRouter = require('./routes/appLogin');
var siteRouter = require('./routes/siteRouter');

var app = express();

var mongoose = require('mongoose');

// Mongoose Schemas
const Movies = require('./routes/models/moviesModel.js');

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb+srv://admin:q4K29kMM8fzmBtXA@cluster0.fm2xf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function() {
    console.log("Mongoose Connected");
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: "VenomStream292929928938082137023971390" }));

app.use('/', siteRouter);
app.use('/app', appindexRouter);
app.use('/app/login', apploginRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});



// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// async function checkDatabase() {
//     var movies = await Movies.find();
//     for (var i = 0; i < movies.length; i++) {
//         if (movies[i].magnet_link.includes("magnet:?xt=urn:btih:0000000000000000000000000000000000000000")) {
//             console.log(movies[i].name);
//             await Movies.deleteOne(movies[i]);
//         }
//     }
// }

// checkDatabase();

// Movies.updateOne({ name: "Black Widow" }, { $set: { genres: ["Action", "Comedy"] } }, function(err, course) {
//     if (err)
//         console.log({ response: 'err' });
//     console.log(course);
// });

// Movies.create({name: "Luca", description: "Un jeune garçon, Luca, vit un été inoubliable, ponctué de délicieux gelato, de savoureuses pasta et de longues balades en scooter. Luca partage ses aventures avec son nouveau meilleur ami, mais ce bonheur est menacé par un secret bien gardé : ce dernier n’est autre qu’un monstre marin venu d’un autre monde, situé juste au-dessous de la surface de l’eau…", rating: 8.1, language: "fr", poster: "https://image.tmdb.org/t/p/w342//qcHvn1nnrk9TEc3aktH0qwqW1jQ.jpg", magnet_link: "magnet:?xt=urn:btih:Y3FPY23MQL3ANXXBWR7E7VFN4K2NBTEE&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce&tr=udp://explodie.org:6969/announce&tr=udp://exodus.desync.com:6969/announce&tr=udp://tracker.internetwarriors.net:1337/announce&tr=udp://ipv4.tracker.harry.lu:80/announce&tr=udp://tracker.tiny-vps.com:6969/announce&tr=udp://9.rarbg.to:2740/announce&tr=udp://9.rarbg.com:2770/announce&tr=http://1337.abcvg.info/announce&tr=http://open.acgnxtracker.com/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://zephir.monocul.us:6969/announce&tr=http://tracker.bt4g.com:2095/announce&tr=udp://opentor.org:2710/announce", popularity: 2966.59, full_torrent: { title: "Luca FRENCH WEBRIP 1080p 2021", seeds: 288, peers: 7, size: "5.26 GB", desc: "https://www.torrent9.pw/torrent/20251/luca-french-webrip-1080p-2021", provider: "Torrent9" }, movieID: "ub619mgx8", __v: 0, genres: ["Animation", "Family"] });

// Script to update Database with new Schema
// const apiKey = "e46eabe7402731804b6d3bf9858dddcc";
// const axios = require('axios');
// const { contextIsolated } = require('process');

// async function updateDatabase() {
//     const movies = await Movies.find();
//     console.log("Starting Database Update... Total Files: " + movies.length);
//     for (let i = 0; i < movies.length; i++) {
//         if (movies[i].release_date == undefined) {
//             console.log("Starting #" + i);
//             if (movies[i].name.includes("S0") || movies[i].name.includes("Saison") || movies[i].name.includes("S1") || movies[i].name.includes("S2") || movies[i].name.includes("S3")) {
//                 var showData = null;
//                 // send a POST request
//                 var name = movies[i].name.replace("Saison ", "S0").replace("S01-", "");
//                 name = name.substring(0, name.length - 3);
//                 await axios({
//                         method: 'get',
//                         url: 'https://api.themoviedb.org/3/search/tv?api_key=' + apiKey + '&language=' + movies[i].language + '&query=' + name + '&page=1&include_adult=false',
//                     })
//                     .then(async(response) => {
//                         showData = response.data.results[0];
//                         console.log(showData.release_date);
//                         await Movies.updateOne({ name: name, language: movies[i].language }, { $set: { release_date: showData.release_date } }, function(err, course) {
//                             if (err)
//                                 console.log({ response: 'err' });
//                         });
//                     }, (error) => {
//                         console.log(error);
//                     });

//             } else {
//                 var movieData = null;
//                 // send a POST request
//                 await axios({
//                         method: 'get',
//                         url: 'https://api.themoviedb.org/3/search/movie?api_key=' + apiKey + '&language=' + movies[i].language + '&query=' + movies[i].name + '&page=1&include_adult=false',
//                     })
//                     .then(async(response) => {
//                         movieData = response.data.results[0];
//                         console.log(movieData.release_date);
//                         await Movies.updateOne({ name: movies[i].name, language: movies[i].language }, { $set: { release_date: movieData.release_date } }, function(err, course) {
//                             if (err)
//                                 console.log({ response: 'err' });
//                         });
//                     }, (error) => {
//                         console.log(error);
//                     });

//             }
//         }
//     }
//     console.log("Done Updating Movies");
// }

// const bcrypt = require('bcrypt');
// const saltRounds = 10;

// bcrypt.hash("pompom4242", saltRounds, function(err, hash) {
//     console.log(hash);
// });

module.exports = app;