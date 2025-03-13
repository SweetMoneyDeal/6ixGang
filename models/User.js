const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    money: {
        type: Number,
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
    highScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

const DEBUG = false;
function log(...args) {
    if (DEBUG) console.log(...args);
}

function updateUI() {
    requestAnimationFrame(() => {
        updateMenu(lastVisitedStation);
        updateInventoryDisplay();
    });
} 