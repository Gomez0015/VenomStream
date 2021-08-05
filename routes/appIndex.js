var express = require('express');
var router = express.Router();
const Movies = require('./models/moviesModel.js');
const Users = require('./models/userModel.js');
const https = require('https');
const axios = require('axios');
const apiKey = process.env.API_KEY;


// TO UPDATE NAMES IF NEEDED
// Movies.findOneAndUpdate({ name: "The Seven Deadly Sins S01-S03" }, { $set: { name: "The Seven Deadly Sins S01-S04" } }, { new: true, upsert: true, returnOriginal: false });

// Torrent Shit Hacker go BRRRRR
const TorrentSearchApi = require('./customModules/torrent-search-api');

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
    if (query == "rating") {
        var categories = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"];

        arrayOfCategories = categories;

        var result = [];
        var endCategories = [];
        arrayOfCategories.forEach(function(key) {
            moviesArray = moviesArray.filter(function(movie) {
                if (Math.floor(movie.rating) == key) {
                    movie.genres[0] = Math.floor(movie.rating);
                    endCategories.includes(key) ? null : endCategories.push(key);
                    result.push(movie);
                    return false;
                } else
                    return true;
            })
        });
        moviesArray = (result);
        arrayOfCategories = endCategories;

        var newArr = [];
        moviesArray.sort(function(a, b) {
            return a.rating - b.rating;
        });

        // put the biggest in new array
        newArr.push(moviesArray.pop());

        // keep grabbing the biggest remaining item and alternate
        // between pushing and unshifting onto the new array
        while (moviesArray.length) {
            newArr[moviesArray.length % 2 === 0 ? 'push' : 'unshift'](moviesArray.pop());
        }

        moviesArray = newArr;

    } else {

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
        moviesArray = (result);

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
    }
    return { moviesArray: moviesArray.reverse(), categories: arrayOfCategories };
}

/* GET home page. */
router.get('/', async function(req, res, next) {
    var sess = req.session;
    var pageObject = getCurrentPage(req);
    var moviesArray = await Movies.find();
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
                            await Movies.create({ name: movieTitle, description: movieData.overview, rating: movieData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + movieData.poster_path, magnet_link: magnet, popularity: movieData.popularity, full_torrent: torrents[0], movieID: Math.random().toString(36).substr(2, 9), genres: [movieDataExtended.genres[0].name] });
                            res.send({ info: "Movie Added", type: "success" });
                        } else {
                            timeSinceStart += 500;
                            loop()
                        }
                    }, 500); //500 = 500ms = 0.5s
                }());
            } else {
                TorrentSearchApi.enableProvider('ThePirateBay');
                const torrents = await TorrentSearchApi.search(movieTitle + " " + movieData.release_date.substring(0, 4) + " 1080p", 'Video', 1);

                var timeSinceStart = 0;
                (function loop() {
                    setTimeout(async function() {
                        if (timeSinceStart >= 20000) {
                            res.send({ info: "Timed Out after 20 Seconds", type: 'error' });
                        } else if (torrents[0] != undefined) {
                            var magnet = await TorrentSearchApi.getMagnet(torrents[0]);
                            await Movies.create({ name: movieTitle, description: movieData.overview, rating: movieData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + movieData.poster_path, magnet_link: magnet, popularity: movieData.popularity, full_torrent: torrents[0], movieID: Math.random().toString(36).substr(2, 9), genres: [movieDataExtended.genres[0].name] });
                            res.send({ info: "Movie Added", type: "success" });
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
        }
        var tvShowID = showData.id;

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
                    await Movies.create({ name: showTitle[0], description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                    if (seasonsMissing.length <= 0) {
                        res.send({ info: "Tv Show or Anime Added", type: "success" });
                    }
                } else {
                    res.send({ info: "This is a duplicate.", type: "error" });
                }
                if (seasonsMissing.length > 0) {
                    for (var i = 0; i < seasonsMissing.length; i++) {
                        var season;
                        if (seasonsMissing[i].season_number < 10) {
                            season = ("S0" + (seasonsMissing[i].season_number));
                        } else {
                            season = ("S" + (seasonsMissing[i].season_number));
                        }
                        var torrents = await TorrentSearchApi.search(showData.name + " " + season, 'TV', 1).catch((error) => { console.log(error) });

                        if (torrents[0] != undefined) {
                            showTitle.push(title + " " + season);
                            torrentsArray.push(torrents[0]);
                        }
                    }

                    for (var i = 0; i < torrentsArray.length; i++) {
                        const showCheck = await Movies.find({ name: showTitle[i], language: language });
                        if (showCheck[0] == undefined) {
                            var magnet = await TorrentSearchApi.getMagnet(torrentsArray[i]);
                            await Movies.create({ name: showTitle[i], description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                        }
                    }
                    res.send({ info: "Tv Show or Anime Added", type: "success" });
                }
            } else {
                for (var i = 0; i < showData.seasons.length; i++) {
                    var season;
                    if (showData.seasons[i].season_number < 10) {
                        season = ("S0" + (showData.seasons[i].season_number));
                    } else {
                        season = ("S" + (showData.seasons[i].season_number));
                    }
                    var torrents = await TorrentSearchApi.search(showData.name + " " + season, 'TV', 1).catch((error) => { console.log(error) });

                    if (torrents[0] != undefined) {
                        showTitle.push(title + " " + season);
                        torrentsArray.push(torrents[0]);
                    }
                }
                for (var i = 0; i < torrentsArray.length; i++) {
                    const showCheck = await Movies.find({ name: showTitle[i], language: language });
                    if (showCheck[0] == undefined) {
                        var magnet = await TorrentSearchApi.getMagnet(torrentsArray[i]);
                        await Movies.create({ name: showTitle[i], description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                    }
                }
                res.send({ info: "Tv Show or Anime Added", type: "success" });
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
                        await Movies.create({ name: showTitle[i], description: showData.overview, rating: showData.vote_average, language: language, poster: 'https://image.tmdb.org/t/p/w342/' + showData.poster_path, magnet_link: magnet, popularity: showData.popularity, movieID: Math.random().toString(36).substr(2, 9), genres: [showData.genres[0].name] });
                    }
                }
                res.send({ info: "Tv Show or Anime Added", type: "success" });
            } else {
                res.send({ info: "Show Torrent not found", type: "error" });
            }
        }
    } else {
        res.send({ info: "This Anime language is not available yet", type: "error" });
    }
});

router.get('/search', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;

    var searchQuery = req.query.searchInput.toLowerCase();

    var movies = await Movies.find();

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
    // var moviesObject = await getMoviesToShow(pageObject, movies);
    // if (moviesObject.moviesArray[0] == undefined) {
    //     pageObject.currentPage -= 1;
    //     moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
    // }

    // moviesObject.moviesArray = mySort(moviesObject.moviesArray, searchQuery);

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
    var moviesArray = await Movies.find();
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
    var moviesArray = await Movies.find();
    var pageObject = getCurrentPage(req);
    var moviesObject = await getMoviesToShow(pageObject, moviesArray, "rating");
    if (moviesObject.moviesArray[0] == undefined) {
        pageObject.currentPage -= 1;
        moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
    }
    res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray.reverse(), categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
});

router.get('/listByLanguage', async function(req, res, next) {
    req.session.themeColor = req.session.themeColor == undefined ? "greenColors" : req.session.themeColor;
    var sess = req.session;
    const moviesArray = await Movies.find();
    switch (req.query.language) {
        case 'English':
            var filteredMovies = await moviesArray.filter(function(a) { return a.language == 'en' });
            filteredMovies = filteredMovies.reverse();
            var pageObject = getCurrentPage(req);
            var moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            if (moviesObject.moviesArray[0] == undefined) {
                pageObject.currentPage -= 1;
                moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
            }
            if (sess.username != null) {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, username: sess.username, favorites: sess.favorites, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            } else {
                res.render('index', { title: 'VenomStream', moviesArray: moviesObject.moviesArray, categories: moviesObject.categories, currentPage: pageObject.currentPage, themeColor: req.session.themeColor });
            }
            break;
        case 'French':
            var filteredMovies = moviesArray.filter(function(a) { return a.language == 'fr'; });
            filteredMovies.sort((a, b) => (a.popularity > b.popularity) ? 1 : -1);
            filteredMovies = filteredMovies.reverse();
            var pageObject = getCurrentPage(req);
            var moviesObject = await getMoviesToShow(pageObject, filteredMovies);
            if (moviesObject.moviesArray[0] == undefined) {
                pageObject.currentPage -= 1;
                moviesObject = await getMoviesToShow(pageObject, moviesArray.reverse());
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