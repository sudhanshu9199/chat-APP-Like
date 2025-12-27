// user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        trim: true, // meaning no spaces before and after
        required: true,
    },
    avatar: {
        type: String,
        default: "",
        trim: true,
    },
    password: {
        type: String,
        minlength: 6,
        required: true,
    },
    about: {
        type: String,
        default: "Hey there! I am using ConnectX.",
        trim: true,
    },

    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

const userModel = mongoose.model('users', userSchema);

module.exports = userModel;