require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const app = express();

// Use environment variable for port or default to 8080
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connection successful'))
    .catch(err => console.error('MongoDB connection error:', err));

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// CORS and Security headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Add this for production logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// API Routes
const apiRouter = express.Router();

apiRouter.post('/register', async (req, res) => {
    try {
        console.log('Register request received:', req.body);
        const { username, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Create new user
        const user = new User({ username, password });
        await user.save();

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                money: user.money,
                inventory: Object.fromEntries(user.inventory),
                itemCosts: Object.fromEntries(user.itemCosts)
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register' });
    }
});

apiRouter.post('/login', async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                money: user.money,
                inventory: Object.fromEntries(user.inventory),
                itemCosts: Object.fromEntries(user.itemCosts)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

apiRouter.post('/save-game', authenticateToken, async (req, res) => {
    try {
        const { money, inventory, itemCosts } = req.body;
        
        req.user.money = money;
        req.user.inventory = inventory;
        req.user.itemCosts = itemCosts;
        
        if (money > req.user.highScore) {
            req.user.highScore = money;
        }
        
        await req.user.save();
        
        res.json({ message: 'Game saved successfully' });
    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({ error: 'Failed to save game' });
    }
});

apiRouter.post('/save-score', authenticateToken, async (req, res) => {
    try {
        const { score } = req.body;
        
        // Update user's high score if the new score is higher
        if (score > req.user.highScore) {
            req.user.highScore = score;
            await req.user.save();
            console.log(`New high score saved for ${req.user.username}: ${score}`);
        }
        
        res.json({ message: 'Score saved successfully' });
    } catch (error) {
        console.error('Save score error:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

apiRouter.get('/highscores', async (req, res) => {
    try {
        console.log('Fetching high scores with params:', req.query);
        
        // Get the top score
        const topScore = await User.findOne({}, 'username highScore')
            .sort({ highScore: -1 })
            .limit(1);
        
        console.log('Top score:', topScore);

        // Get the scores around the target score if provided
        const targetScore = parseInt(req.query.score);
        let surroundingScores = [];
        
        if (targetScore) {
            console.log('Finding scores around:', targetScore);
            
            // Find 5 scores above
            const scoresAbove = await User.find(
                { highScore: { $gt: targetScore } },
                'username highScore'
            )
            .sort({ highScore: 1 })
            .limit(5);
            
            console.log('Scores above:', scoresAbove);

            // Find 5 scores below
            const scoresBelow = await User.find(
                { highScore: { $lt: targetScore } },
                'username highScore'
            )
            .sort({ highScore: -1 })
            .limit(5);
            
            console.log('Scores below:', scoresBelow);

            // Get current user's score
            let currentUserScore = null;
            if (req.query.username) {
                currentUserScore = await User.findOne(
                    { username: req.query.username },
                    'username highScore'
                );
                console.log('Current user score:', currentUserScore);
            }

            // Combine all scores
            surroundingScores = [
                ...scoresAbove.reverse(),
                ...(currentUserScore ? [currentUserScore] : []),
                ...scoresBelow
            ];

            // Remove duplicates (in case current user's score was in above/below)
            surroundingScores = surroundingScores.filter((score, index, self) =>
                index === self.findIndex(s => s.username === score.username)
            );

            // Sort by score descending
            surroundingScores.sort((a, b) => b.highScore - a.highScore);
            
            console.log('Final surrounding scores:', surroundingScores);
        }

        const response = {
            topScore,
            surroundingScores,
            success: true
        };
        
        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ 
            error: 'Failed to fetch scores',
            details: error.message,
            success: false
        });
    }
});

// Mount API routes first
app.use('/api', apiRouter);

// Serve static files from specific directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Basic error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    // Always return JSON for API routes
    if (req.path.startsWith('/api/')) {
        res.status(500).json({ error: 'Something broke!', details: err.message });
    } else {
        res.status(500).send('Server Error');
    }
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
}); 