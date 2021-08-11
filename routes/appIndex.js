var express = require('express');
var router = express.Router();
const Movies = require('./models/moviesModel.js');
const Users = require('./models/userModel.js');
const https = require('https');
const axios = require('axios');
const apiKey = "e46eabe7402731804b6d3bf9858dddcc";


// TO UPDATE NAMES IF NEEDED
// Movies.findOneAndUpdate({ name: "The Seven Deadly Sins S01-S03" }, { $set: { name: "The Seven Deadly Sins S01-S04" } }, { new: true, upsert: true, returnOriginal: false });

// Torrent Shit Hacker go BRRRRR
const TorrentSearchApi = require('./customModules/torrent-search-api');
const { compareSync } = require('bcrypt');

var rankedByRating;
var homeMovies;
var englishMoviesFiltered;
var frenchMoviesFiltered;
async function getDatabaseShit() {
    console.log("Fetching Database...");
    allMovies = await Movies.find();
    allMovies = allMovies.filter((allMovies, index, self) =>
        index === self.findIndex((t) => (
            t.name === allMovies.name && t.language === allMovies.language
        ))
    );
    homeMovies = allMovies;
    rankedByRating = allMovies.sort((a, b) => (a.rating < b.rating) ? 1 : ((b.rating < a.rating) ? -1 : 0));
    englishMoviesFiltered = await allMovies.filter(function(a) { return a.language == 'en' });
    frenchMoviesFiltered = await allMovies.filter(function(a) { return a.language == 'fr' });
    console.log("Done...");
}

getDatabaseShit();

async function getMoviesToShow(pageObject, movies, query) {
    var moviesArray = movies;
    var arrayOfCategories = [];

    function findWithAttr(array, attr, value) {
        for (var i = 0; i < array.length; i += 1) {
            if (array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }

    var categories = [];
    for (var i = 0; i < moviesArray.length; i++) {
        if (findWithAttr(categories, 'category', moviesArray[i].genres[0]) == -1) {
            categories.push({ category: moviesArray[i].genres[0], popularity: moviesArray[i].popularity });
        } else {
            var id = findWithAttr(categories, 'category', moviesArray[i].genres[0]);
            categories[id].popularity = categories[id].popularity + moviesArray[i].popularity;
        }
    }

    categories = categories.sort((a, b) => (a.popularity < b.popularity) ? 1 : -1);

    for (var i = ((pageObject.currentPage - 1) * 8); i < (((pageObject.currentPage - 1) * 8) + 8); i++) {
        if (categories[i] !== undefined) {
            arrayOfCategories.push(categories[i].category);
        }
    }
    var result = [];
    arrayOfCategories.forEach(function(key) {
        moviesArray = moviesArray.filter(function(movie) {
            if (movie.genres[0] == key) {
                result.push(movie);
                return false;
            } else
                return true;
        })
    });
    moviesArray = result;

    var newArr = [];
    moviesArray.sort(function(a, b) {
        return a.popularity - b.popularity;
    });

    // put the biggest in new array
    newArr.push(moviesArray.pop());

    // keep grabbing the biggest remaining item and alternate
    // between pushing and unshifting onto the new array
    while (moviesArray.length) {
        newArr[moviesArray.length % 2 === 0 ? 'push' : 'unshift'](moviesArray.pop());
    }
    moviesArray = newArr;

    return { moviesArray: moviesArray.reverse(), categories: arrayOfCategories };
}

/* GET home page. */
router.get('/', async function(req, res, next) {
    if (req.session.authorized == true) {
        var sess = req.session;
        var pageObject = getCurrentPage(req);
        var moviesArray = homeMovies.slice(0);
        var moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());

        if (moviesObject.moviesArray[0] == undefined) {
            pageObject.currentPage -= 1;
            moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
        }
        var info = sess.info;
        req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;
        if (sess.username != null) {
            if (sess.info != null) {
                sess.info = null;
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, info: info, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            } else {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            }
        } else {
            if (sess.info != null) {
                sess.info = null;
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, info: info, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            } else {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            }
        }
    } else {
        res.redirect('/login');
    }
});

function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        // You do not need to check if i is larger than splitStr length, as your for does that for you
        // Assign it back to the array
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    // Directly return the joined string
    return splitStr.join(' ');
}


router.post('/addmovie', async function(req, res, next) {

    var title;
    var language = req.body.language;

    if (req.query.movieName) {
        title = titleCase(req.query.movieName);
    } else {
        title = titleCase(req.body.movieTitle);
    }

    if (req.body.type == 'movie') {
        var movieData = null;
        // send a POST request
        await axios({
                method: 'get',
                url: 'https://api.themoviedb.org/3/search/movie?api_key=' + apiKey + '&language=' + language + '&query=' + title + '&page=1&include_adult=false',
            })
            .then((response) => {
                movieData = response.data.results[0];
            }, (error) => {
                console.log(error);
            });
        if (movieData == undefined) {
            res.send({ info: "Movie not found", type: 'error' });
        }
        var movieDataExtended = null;
        await axios({
                method: 'get',
                url: 'https://api.themoviedb.org/3/movie/' + movieData.id + '?api_key=' + apiKey + '&language=' + language,
            })
            .then((response) => {
                movieDataExtended = response.data;
            }, (error) => {
                console.log(error);
            });


        var movieTitle = movieData.title;

        const movieCheck = await Movies.find({ name: movieTitle, language: language });

        if (movieCheck[0] != undefined) {
            res.send({ info: "Movie is a Duplicate", type: 'error' });
        } else if (movieDataExtended.genres.length == 0) {
            res.send({ info: "Movie info had an error", type: 'error' });
        } else {
            TorrentSearchApi.disableAllProviders();
            if (language == 'fr') {
                TorrentSearchApi.enableProvider('Torrent9');
                // Search (Movie Title + Release Date) in 'Movies' category and limit to 1 results
                const torrents = await TorrentSearchApi.search(movieTitle + " " + movieData.release_date.substring(0, 4) + " 1080p", 'Movies', 1);

                var timeSinceStart = 0;
                (function loop() {
                    setTimeout(async function() {
                        if (timeSinceStart >= 20000) {
                            res.send({ info: "Timed Out after 20 Seconds", type: 'error' });
                        } else if (torrents[0] != undefined) {
                            var magnet = await TorrentSearchApi.getMagnet(torrents[0]);
                            await Movies.create({ name: movieTitle, description: movieData.overview, rating: movieData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + movieData.poster_path, magnet_link: magnet, popularity: movieData.popularity, full_torrent: torrents[0], movieID: Math.random().toString(36).substr(2, 9), genres: [movieDataExtended.genres[0].name], release_date: movieData.release_date });
                            console.log("Updating Database...");
                            getDatabaseShit();
                            res.send({ info: "Movie Added", type: "success" });
                        } else {
                            timeSinceStart += 500;
                            loop()
                        }
                    }, 500); //500 = 500ms = 0.5s
                }());
            } else {
                TorrentSearchApi.enableProvider('ThePirateBay');
                const torrents = await TorrentSearchApi.search(movieTitle.replace("'", "").replace("#", "").replace(";", "").replace(":", "") + " " + movieData.release_date.substring(0, 4) + " 1080p", 'Video', 5);
                var timeSinceStart = 0;
                var currentTorrentCount = 0;
                (function loop() {
                    setTimeout(async function() {
                        console.log(torrents[currentTorrentCount]);
                        if (timeSinceStart >= 20000) {
                            res.send({ info: "Timed Out after 20 Seconds", type: 'error' });
                        } else if (currentTorrentCount >= torrents.length) {
                            res.send({ info: "Could not find Torrent for this Movie", type: 'error' });
                        } else if (torrents[currentTorrentCount] != undefined) {
                            console.log(torrents[currentTorrentCount].title);
                            if (torrents[currentTorrentCount].title != "No results returned") {
                                var magnet = await TorrentSearchApi.getMagnet(torrents[currentTorrentCount]);
                                await Movies.create({ name: movieTitle, release_date: movieData.release_date, description: movieData.overview, rating: movieData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + movieData.poster_path, magnet_link: magnet, popularity: movieData.popularity, full_torrent: torrents[currentTorrentCount], movieID: Math.random().toString(36).substr(2, 9), genres: [movieDataExtended.genres[0].name] });
                                console.log("Updating Database...");
                                getDatabaseShit();
                                res.send({ info: "Movie Added", type: "success" });
                            } else {
                                currentTorrentCount += 1;
                                timeSinceStart += 500;
                                loop()
                            }
                        } else {
                            timeSinceStart += 500;
                            loop()
                        }
                    }, 500); //500 = 500ms = 0.5s
                }());
            }
        }
    } else if (req.body.type == 'anime' && language == 'en' || req.body.type == 'show') {

        var showData = null;
        // send a POST request
        await axios({
                method: 'get',
                url: 'https://api.themoviedb.org/3/search/tv?api_key=' + apiKey + '&language=' + language + '&query=' + title + '&page=1&include_adult=false',
            })
            .then((response) => {
                showData = response.data.results[0];
            }, (error) => {
                console.log(error);
            });
        if (showData == undefined) {
            res.send({ info: "Show was not found", type: "error" });
        } else {
            var tvShowID = showData.id;
            var notAnime = false;
            if (req.body.type == 'anime') {
                await axios({
                        method: 'get',
                        url: 'https://api.themoviedb.org/3/tv/' + tvShowID + '/keywords?api_key=' + apiKey,
                    })
                    .then((response) => {
                        checkIfAnime = response.data.results;
                    }, (error) => {
                        console.log(error);
                    });
                for (var i = 0; i < checkIfAnime.length; i++) {
                    if (checkIfAnime[i].name.includes("anime")) {
                        notAnime = false;
                        break;
                    } else if (i == (checkIfAnime.length - 1)) {
                        notAnime = true;
                    }
                }
            }
            if (notAnime) {
                res.send({ info: "Anime was not found", type: "error" });
            } else {
                await axios({
                        method: 'get',
                        url: 'https://api.themoviedb.org/3/tv/' + tvShowID + '?api_key=' + apiKey + '&language=' + language,
                    })
                    .then((response) => {
                        showData = response.data;
                    }, (error) => {
                        console.log(error);
                    });
                if (showData.seasons.length == 0) {
                    res.send({ info: "Show was not found", type: "error" });
                }

                TorrentSearchApi.disableAllProviders();
                if (language == 'en') {
                    if (req.body.type == 'anime') {
                        TorrentSearchApi.enableProvider('animetosho');
                    } else {
                        TorrentSearchApi.enableProvider('1337x');
                    }
                } else {
                    TorrentSearchApi.enableProvider('Torrent9');
                }
                // Search (TV SHow Title + Season + Episode) in 'TV Show' category and limit to 1 results
                var torrentsArray = [];
                var showTitle = [];

                if (showData.seasons[0].season_number <= 0) {
                    showData.seasons.shift();
                }

                showData.name = showData.name.replace("&", "and");

                if (language == 'en') {
                    var temporaryShowData = JSON.parse(JSON.stringify(showData));
                    var torrents = [];
                    var seasonsMissing = [];

                    for (var i = 0; i < showData.seasons.length; i++) {
                        if (temporaryShowData.seasons.length == 1) {
                            break;
                        }
                        var season = ("S0" + (temporaryShowData.seasons[0].season_number) + "-S" + ((temporaryShowData.seasons.length < 11) ? "0" + (temporaryShowData.seasons[(temporaryShowData.seasons.length - 1)].season_number) : (temporaryShowData.seasons[(temporaryShowData.seasons.length - 1)].season_number)));
                        torrents = await TorrentSearchApi.search(temporaryShowData.name + " " + season, 'TV', 1).catch((error) => { console.log(error) });
                        if (torrents.length > 0) {
                            break;
                        } else {
                            seasonsMissing.push(temporaryShowData.seasons[(temporaryShowData.seasons.length - 1)]);
                            temporaryShowData.seasons.pop();
                        }
                    }

                    seasonsMissing = seasonsMissing.reverse();

                    if (torrents[0] != undefined) {
                        showTitle.push(showData.name + " " + season);
                        torrentsArray.push(torrents[0]);
                        const showCheck = await Movies.find({ name: showTitle[0], language: language });
                        if (showCheck[0] == undefined) {
                            var magnet = await TorrentSearchApi.getMagnet(torrents[0]);
                            await Movies.create({ name: showTitle[0], release_date: showData.release_date, description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                            if (seasonsMissing.length <= 0) {
                                console.log("Updating Database...");
                                getDatabaseShit();
                                res.send({ info: "Tv Show or Anime Added", type: "success" });
                            }
                        } else {
                            res.send({ info: "This is a duplicate.", type: "error" });
                        }
                        if (seasonsMissing.length > 0) {
                            var currentSearchIndex = 0;
                            for (var i = 0; i < seasonsMissing.length; i++) {
                                var season;
                                if (seasonsMissing[i].season_number < 10) {
                                    season = ("S0" + (seasonsMissing[i].season_number));
                                } else {
                                    season = ("S" + (seasonsMissing[i].season_number));
                                }
                                var torrents = await TorrentSearchApi.search(showData.name + " " + season, 'TV', (currentSearchIndex + 1)).catch((error) => { console.log(error) });
                                if (torrents[currentSearchIndex] != undefined) {
                                    var torrentTitle = torrents[currentSearchIndex].title;
                                    var torrentEpCheck = torrentTitle.substr(torrentTitle.indexOf(season), 6).substr(4).match(/(\d+)/);
                                    if (currentSearchIndex >= 10) {
                                        currentSearchIndex = 0;
                                    } else if (torrentEpCheck != null) {
                                        if (100 > torrentEpCheck[0] > 0) {
                                            i = i - 1;
                                            currentSearchIndex = currentSearchIndex + 1;
                                        }
                                    } else {
                                        showTitle.push(title + " " + season);
                                        torrentsArray.push(torrents[0]);
                                        currentSearchIndex = 0;
                                    }
                                }
                            }

                            for (var i = 0; i < torrentsArray.length; i++) {
                                const showCheck = await Movies.find({ name: showTitle[i], language: language });
                                if (showCheck[0] == undefined) {
                                    var magnet = await TorrentSearchApi.getMagnet(torrentsArray[i]);
                                    await Movies.create({ name: showTitle[i], release_date: showData.release_date, description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                                }
                            }
                            if (torrentsArray.length > 0) {
                                console.log("Updating Database...");
                                getDatabaseShit();
                                res.send({ info: "Tv Show or Anime Added", type: "success" });
                            } else {
                                res.send({ info: "No torrents for this Show or Anime found", type: "error" });
                            }
                        }
                    } else {
                        var currentSearchIndex = 0;
                        for (var i = 0; i < showData.seasons.length; i++) {
                            var season;
                            if (showData.seasons[i].season_number < 10) {
                                season = ("S0" + (showData.seasons[i].season_number));
                            } else {
                                season = ("S" + (showData.seasons[i].season_number));
                            }
                            var torrents = await TorrentSearchApi.search(showData.name + " " + season, 'TV', (currentSearchIndex + 1)).catch((error) => { console.log(error) });
                            if (torrents[currentSearchIndex] != undefined) {
                                var torrentTitle = torrents[currentSearchIndex].title;
                                var torrentEpCheck = torrentTitle.substr(torrentTitle.indexOf(season), 6).substr(4).match(/(\d+)/);
                                if (currentSearchIndex >= 10) {
                                    currentSearchIndex = 0;
                                } else if (torrentEpCheck != null) {
                                    if (100 > torrentEpCheck[0] > 0) {
                                        i = i - 1;
                                        currentSearchIndex = currentSearchIndex + 1;
                                    }
                                } else {
                                    showTitle.push(title + " " + season);
                                    torrentsArray.push(torrents[currentSearchIndex]);
                                }
                            }
                        }
                        for (var i = 0; i < torrentsArray.length; i++) {
                            const showCheck = await Movies.find({ name: showTitle[i], language: language });
                            if (showCheck[0] == undefined) {
                                var magnet = await TorrentSearchApi.getMagnet(torrentsArray[i]);
                                await Movies.create({ name: showTitle[i], release_date: showData.release_date, description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                            }
                        }
                        if (torrentsArray.length > 0) {
                            console.log("Updating Database...");
                            getDatabaseShit();
                            res.send({ info: "Tv Show or Anime Added", type: "success" });
                        } else {
                            res.send({ info: "No torrents for this Show or Anime found", type: "error" });
                        }
                    }

                } else {

                    for (var i = 0; i < showData.seasons.length; i++) {
                        var season = ("Saison " + (showData.seasons[i].season_number));
                        var torrents = await TorrentSearchApi.search(showData.name + " " + season, 'TV', 1).catch((error) => { console.log(error) });

                        if (torrents[0] != undefined) {
                            showTitle.push(title + " " + season);
                            torrentsArray.push(torrents[0]);
                        }
                    }
                    if (torrentsArray.length != 0) {
                        for (var i = 0; i < torrentsArray.length; i++) {
                            const showCheck = await Movies.find({ name: showTitle[i], language: language });
                            if (showCheck[0] == undefined) {
                                var magnet = await TorrentSearchApi.getMagnet(torrentsArray[i]);
                                await Movies.create({ name: showTitle[i], release_date: showData.release_date, description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                            }
                        }
                        console.log("Updating Database...");
                        getDatabaseShit();
                        res.send({ info: "Tv Show or Anime Added", type: "success" });
                    } else {
                        res.send({ info: "Show Torrent not found", type: "error" });
                    }
                }
            }
        }
    } else {
        res.send({ info: "This Anime language is not available yet", type: "error" });
    }
});

router.get('/search', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;

    var searchQuery = req.query.searchInput.toLowerCase();

    var movies = homeMovies;

    function mySort(arrKeys, searchkey) {
        var matchedKeys = [],
            notMatchedKeys = [];

        for (var i = 0; i < arrKeys.length; i++) {
            if (arrKeys[i].name.toLowerCase().match(searchkey)) { //dummy logic
                matchedKeys.push(arrKeys[i]); //push on the basis of order
            } else {
                notMatchedKeys.push(arrKeys[i]);
            }
        }
        return matchedKeys.concat(notMatchedKeys);
    }


    var sess = req.session;

    movies = mySort(movies, searchQuery);

    var pageObject = getCurrentPage(req);

    var startIndex = ((pageObject.currentPage - 1) * 100);
    if (startIndex >= movies.length - 1) {
        movies = movies.splice((startIndex - 100), 100);
        pageObject.currentPage -= 1;
    } else {
        movies = movies.splice(startIndex, 100);
    }

    if (sess.username != null) {
        res.render('index', { title: 'VenomStream', moviesArray: movies, searchLink: true, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
    } else {
        res.render('index', { title: 'VenomStream', moviesArray: movies, searchLink: true, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
    }
});


router.post('/addfavorite', async function(req, res, next) {
    var movieTitle = req.body.movie;
    var action = req.body.action;
    var sess = req.session;
    const user = await Users.findOne({ username: sess.username });
    switch (action) {
        case 'add':
            user.favorites.push(movieTitle);
            user.save();
            sess.favorites = user.favorites;
            break;
        case 'remove':
            var index = user.favorites.indexOf(movieTitle);
            user.favorites.splice(index, 1);
            user.save();
            sess.favorites = user.favorites;
            break;
        case 'default':
            break;
    }

    res.send("Added/Removed Favorite");
});

router.get('/listFavorites', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;
    var sess = req.session;
    var moviesArray = homeMovies;
    var favoritesArray = [];
    for (let i = 0; i < moviesArray.length; i++) {
        if (sess.favorites.includes(moviesArray[i].movieID)) {
            favoritesArray.push(moviesArray[i]);
        }
    }
    var pageObject = getCurrentPage(req);
    var moviesObject = await getMoviesToShow(pageObject, favoritesArray.reverse());
    if (moviesObject.moviesArray[0] == undefined) {
        pageObject.currentPage -= 1;
        moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
    }
    res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
});

router.get('/listRatings', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;

    var sess = req.session;
    var pageObject = getCurrentPage(req);
    var startIndex = ((pageObject.currentPage - 1) * 100);
    var movies = rankedByRating.slice(0);
    if (startIndex >= movies.length - 1) {
        movies = movies.splice((startIndex - 100), 100);
        pageObject.currentPage -= 1;
    } else {
        movies = movies.splice(startIndex, 100);
    }

    res.render('index', { title: 'VenomStream', moviesArray: movies, searchLink: true, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
});

router.get('/listByLanguage', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;
    var sess = req.session;
    switch (req.query.language) {
        case 'English':
            var filteredMovies = englishMoviesFiltered;
            filteredMovies = filteredMovies.reverse();
            var pageObject = getCurrentPage(req);
            var moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            if (moviesObject.moviesArray[0] == undefined) {
                pageObject.currentPage -= 1;
                moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            }
            if (sess.username != null) {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            } else {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            }
            break;
        case 'French':
            var filteredMovies = frenchMoviesFiltered;
            filteredMovies.sort((a, b) => (a.popularity > b.popularity) ? 1 : -1);
            filteredMovies = filteredMovies.reverse();
            var pageObject = getCurrentPage(req);
            var moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            if (moviesObject.moviesArray[0] == undefined) {
                pageObject.currentPage -= 1;
                moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            }
            if (sess.username != null) {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            } else {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            }
            break;
    }
});

router.get('/logout', async function(req, res, next) {
    req.session.username = null;
    req.session.authorized = false;
    res.redirect('/app/');
});

function getCurrentPage(req) {
    var currentPage;

    if (req.query.currentPage == 0) {
        req.query.currentPage = 1;
    }
    if (req.query.action === "next") {
        currentPage = req.query.currentPage;
    } else if (req.query.action === "previous") {
        currentPage = req.query.currentPage;
    } else {
        currentPage = 1;
    }
    return { currentPage: currentPage };
}

router.post('/setThemeColor', async function(req, res, next) {
    req.session.themeColor = req.body.color;
    res.send('Updated Theme');
});

module.exports = router;