'use strict';
const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var movieSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    rating: {
        type: Number
    },
    language: {
        type: String
    },
    poster: {
        type: String
    },
    magnet_link: {
        type: String
    },
    popularity: {
        type: Number
    },
    movieID: {
        type: String,
    },
    full_torrent: {
        type: Object,
    },
    genres: {
        type: Array,
    }
});

module.exports = mongoose.model('Movies', movieSchema);