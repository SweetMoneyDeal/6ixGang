const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    money: {
        type: Number,
        required: true,
        default: 1000
    },
    inventory: {
        type: Map,
        of: Number,
        default: {}
    },
    itemCosts: {
        type: Map,
        of: Number,
        default: {}
    },
    lastVisitedStation: {
        type: String,
        required: true,
        default: 'Kipling'
    },
    currentTime: {
        type: Date,
        required: true,
        default: () => {
            const now = new Date();
            now.setHours(22, 0, 0, 0);
            return now;
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update the updatedAt field on save
gameStateSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('GameState', gameStateSchema); 