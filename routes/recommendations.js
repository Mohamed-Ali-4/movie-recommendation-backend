const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const Movie = require('../models/Movie');
const User = require('../models/User');
const { generateSmartRecommendations } = require('../services/aiRecommendation');
const { recommendByMood } = require('../services/moodRecommendation');

// Mood-based recommendations (public)
router.post('/mood', async (req, res) => {
  try {
    const { mood } = req.body || {};
    if (typeof mood !== 'string' || mood.trim().length < 2) {
      return res.status(400).json({ message: 'Provide a mood description (min 2 chars).' });
    }
    if (mood.length > 500) {
      return res.status(400).json({ message: 'Mood text too long (max 500 chars).' });
    }
    const result = await recommendByMood(mood.trim());
    res.json(result);
  } catch (err) {
    console.error('Mood recommendation error:', err);
    res.status(500).json({ message: err.message });
  }
});

// AI Search for movies
router.post('/search', async (req, res) => {
  try {
    const { query, userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const movies = await Movie.find();

    const searchResults = movies.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(query.toLowerCase());
      const genreMatch = movie.genre.some(g => g.toLowerCase().includes(query.toLowerCase()));
      const descMatch = movie.description.toLowerCase().includes(query.toLowerCase());
      
      return titleMatch || genreMatch || descMatch;
    });

    const scoredResults = searchResults.map(movie => {
      let score = 0;
      
      if (movie.title.toLowerCase() === query.toLowerCase()) score += 100;
      if (movie.title.toLowerCase().includes(query.toLowerCase())) score += 50;
      if (movie.genre.some(g => g.toLowerCase().includes(query.toLowerCase()))) score += 30;
      score += movie.rating;
      
      return { ...movie.toObject(), searchScore: score };
    });

    const topResults = scoredResults
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, 5);

    res.json({
      query,
      results_count: topResults.length,
      results: topResults.map(({ searchScore, ...movie }) => movie)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET AI-powered recommendations
router.get('/ai/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const movies = await Movie.find();
    
    // Use smart AI recommendations
    const result = await generateSmartRecommendations(user, movies);

    res.json({
      user: user.name,
      preferences: user.preferences,
      recommendations: result.recommendations,
      trending: result.trending,
      aiPowered: result.recommendations.some(r => r.aiPowered)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET recommendations for a user
router.get('/:userId', async (req, res) => {
  try {
    const recommendations = await Recommendation.find({ user: req.params.userId })
      .populate('movies', 'title genre rating');
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create recommendation
router.post('/', async (req, res) => {
  try {
    const recommendation = new Recommendation(req.body);
    const saved = await recommendation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
