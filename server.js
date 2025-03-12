const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

// Use environment variable for port or default to 8080
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pound416';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Parse JSON bodies
app.use(express.json());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Add this for production logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Define MongoDB schemas
const highScoreSchema = new mongoose.Schema({
    name: String,
    score: Number,
    date: { type: Date, default: Date.now }
});

const gameStateSchema = new mongoose.Schema({
    playerId: String,
    inventory: Object,
    money: Number,
    currentStation: String,
    lastUpdated: { type: Date, default: Date.now }
});

const HighScore = mongoose.model('HighScore', highScoreSchema);
const GameState = mongoose.model('GameState', gameStateSchema);

// Serve static files from the current directory
app.use(express.static(__dirname, {
    maxAge: '1h' // Cache static assets for 1 hour
}));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes
app.get('/api/highscores', async (req, res) => {
    try {
        const topScores = await HighScore.find()
            .sort({ score: -1 })
            .limit(10);
        res.json(topScores);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

app.post('/api/highscores', async (req, res) => {
    try {
        const { name, score } = req.body;
        const newScore = new HighScore({ name, score });
        await newScore.save();
        
        // Get top 10 scores
        const topScores = await HighScore.find()
            .sort({ score: -1 })
            .limit(10);
        
        res.json(topScores);
    } catch (error) {
        console.error('Error saving high score:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

app.post('/api/save-game', async (req, res) => {
    try {
        const { playerId, inventory, money, currentStation } = req.body;
        const gameState = await GameState.findOneAndUpdate(
            { playerId },
            { inventory, money, currentStation },
            { upsert: true, new: true }
        );
        res.json(gameState);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save game state' });
    }
});

app.get('/api/load-game/:playerId', async (req, res) => {
    try {
        const gameState = await GameState.findOne({ playerId: req.params.playerId });
        if (!gameState) {
            return res.status(404).json({ error: 'Game state not found' });
        }
        res.json(gameState);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load game state' });
    }
});

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});

// Add console logs for debugging
console.log('MongoDB connection status:', mongoose.connection.readyState); 