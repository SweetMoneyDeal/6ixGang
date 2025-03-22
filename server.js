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
        console.log('🔄 Attempting to load high scores from:', highScoresPath);
        // Check if file exists
        try {
            await fs.access(highScoresPath);
            console.log('✅ High scores file exists');
        } catch (error) {
            // If file doesn't exist, create it with empty array
            console.log('📝 Creating new high scores file with empty array');
            await fs.writeFile(highScoresPath, '[]', { mode: 0o666 });
            console.log('✅ New high scores file created successfully');
        }

        const data = await fs.readFile(highScoresPath, 'utf8');
        console.log('📖 Raw file contents:', data);
        try {
            const parsedData = JSON.parse(data);
            console.log('✅ Successfully parsed high scores:', parsedData);
            return parsedData;
        } catch (error) {
            console.error('❌ Error parsing high scores file:', error);
            console.log('🔄 Resetting to empty array');
            await fs.writeFile(highScoresPath, '[]', { mode: 0o666 });
            return [];
        }
    } catch (error) {
        console.error('❌ Error in loadHighScores:', error);
        return [];
    }
}

// Save high scores to file
async function saveHighScores(scores) {
    try {
        console.log('💾 Attempting to save high scores:', scores);
        
        // Validate scores before saving
        if (!Array.isArray(scores)) {
            throw new Error('Scores must be an array');
        }
        
        // Format the JSON with indentation for readability
        const jsonData = JSON.stringify(scores, null, 2);
        console.log('📝 Formatted data to save:', jsonData);
        
        await fs.writeFile(highScoresPath, jsonData, { 
            mode: 0o666, // Set file permissions to be readable/writable
            flag: 'w' // Create file if it doesn't exist
        });
        console.log('✅ High scores saved successfully to:', highScoresPath);
        
        // Verify the save by reading back
        const savedData = await fs.readFile(highScoresPath, 'utf8');
        console.log('🔍 Verifying saved data:', savedData);
        
        // Parse the saved data to ensure it's valid JSON
        const parsedData = JSON.parse(savedData);
        console.log('✅ Verification complete - data is valid JSON');
        
        // Compare lengths to ensure all data was saved
        if (parsedData.length !== scores.length) {
            console.warn('⚠️ Warning: Saved data length differs from input length');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error in saveHighScores:', error);
        throw error; // Re-throw to handle in the route
    }
}

// Initialize high scores
let highScores = [];
loadHighScores().then(scores => {
    highScores = scores;
    console.log('High scores loaded:', highScores);
}).catch(error => {
    console.error('Error initializing high scores:', error);
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
        console.log('Fetching high scores...');
        // Reload from file to ensure we have latest data
        highScores = await loadHighScores();
        const topScores = highScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        console.log('Sending high scores to client:', topScores);
        res.json(topScores);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

app.post('/api/highscores', async (req, res) => {
    try {
        console.log('📥 Received new high score request:', req.body);
        const { name, score } = req.body;
        
        if (!name || typeof score !== 'number') {
            console.error('❌ Invalid score data received:', { name, score });
            return res.status(400).json({ error: 'Invalid score data' });
        }
        
        // Reload current scores from file
        console.log('🔄 Loading existing scores...');
        highScores = await loadHighScores();
        console.log('📊 Current high scores:', highScores);
        
        const newScore = { 
            name: name.slice(0, 20), // Limit name length
            score: Math.floor(score), // Ensure score is an integer
            date: new Date().toISOString() 
        };
        
        console.log('➕ Adding new score:', newScore);
        highScores.push(newScore);
        
        // Sort and get top 10 scores
        const topScores = highScores
            .sort((a, b) => b.score - a.score) // Sort by score in descending order
            .slice(0, 10);
        
        console.log('🏆 Top 10 scores after sorting:', topScores);
        
        // Update the stored high scores
        console.log('💾 Saving updated high scores...');
        highScores = topScores;
        await saveHighScores(highScores);
        
        console.log('✅ High score saved and response ready');
        res.json(topScores);
    } catch (error) {
        console.error('❌ Error in POST /api/highscores:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// Basic error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
}); 