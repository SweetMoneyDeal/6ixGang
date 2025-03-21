const express = require('express');
const path = require('path');
const app = express();

// Use environment variable for port or default to 8080
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Trust proxy for Railway
app.set('trust proxy', 1);

// Redirect HTTP to HTTPS in production
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});

// Parse JSON bodies
app.use(express.json());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Allow your custom domain and Railway domain
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    next();
});

// Add this for production logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// In-memory storage for high scores
let highScores = [];

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
        const newScore = { name, score, date: new Date() };
        highScores.push(newScore);
        
        // Get top 10 scores
        const topScores = highScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
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