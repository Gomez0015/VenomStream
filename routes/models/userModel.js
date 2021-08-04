'use strict';
const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    favorites: {
        type: Array,
    },
});

module.exports = mongoose.model('Users', userSchema);