const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Compression middleware
app.use(compression());

// Cache middleware
app.use((req, res, next) => {
  // Cache static assets for 1 year
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache API responses for 5 minutes
  else if (req.url.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300');
  }

  next();
});

// =======================
// CORS
// =======================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://movie-recommendation-frontend-tau.vercel.app'
  ],
  credentials: true
}));

// =======================
// Middleware
// =======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  limit: '10mb',
  extended: true
}));

// =======================
// Routes
// =======================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/profile', require('./routes/profile'));

// =======================
// Root Route
// =======================
app.get('/', (req, res) => {
  res.send('🎬 CineAI Backend Running Successfully');
});

// =======================
// MongoDB Connection
// =======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected!');

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
  });