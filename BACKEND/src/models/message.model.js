const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    seen: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const messageModel = mongoose.model('messages', messageSchema);

module.exports = messageModel;