const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs').promises;

// Use environment variable for port or default to 8080
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

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

// File path for storing high scores
const highScoresPath = path.join(__dirname, 'highscores.json');

// Load high scores from file
async function loadHighScores() {
    try {
        const data = await fs.readFile(highScoresPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('No existing high scores file, starting with empty array');
        return [];
    }
}

// Save high scores to file
async function saveHighScores(scores) {
    try {
        await fs.writeFile(highScoresPath, JSON.stringify(scores, null, 2));
    } catch (error) {
        console.error('Error saving high scores:', error);
    }
}

// Initialize high scores
let highScores = [];
loadHighScores().then(scores => {
    highScores = scores;
    console.log('High scores loaded:', highScores);
});

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
        const topScores = highScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        res.json(topScores);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

app.post('/api/highscores', async (req, res) => {
    try {
        const { name, score } = req.body;
        
        if (!name || typeof score !== 'number') {
            return res.status(400).json({ error: 'Invalid score data' });
        }
        
        const newScore = { 
            name: name.slice(0, 20), // Limit name length
            score: Math.floor(score), // Ensure score is an integer
            date: new Date().toISOString() 
        };
        
        highScores.push(newScore);
        
        // Sort and get top 10 scores
        const topScores = highScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        // Update the stored high scores
        highScores = topScores;
        await saveHighScores(highScores);
        
        res.json(topScores);
    } catch (error) {
        console.error('Error saving high score:', error);
        res.status(500).json({ error: 'Failed to save score' });
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