const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const Movie = require('../models/Movie');
const User = require('../models/User');

// GET AI recommendations for a user (Simple genre matching)
router.get('/ai/:userId', async (req, res) => {
  try {
    // Get user preferences
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get all movies from database
    const movies = await Movie.find();

    // Score each movie based on user preferences
    const scoredMovies = movies.map(movie => {
      let score = 0;
      let matchedGenres = [];

      // Check how many genres match
      user.preferences.forEach(pref => {
        if (movie.genre.includes(pref)) {
          score += 2;
          matchedGenres.push(pref);
        }
      });

      // Add bonus for high rating
      score += movie.rating;

      return {
        ...movie.toObject(),
        score,
        matchedGenres
      };
    });

    // Sort by score and get top 3
    const topRecommendations = scoredMovies
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(movie => ({
        movie: {
          _id: movie._id,
          title: movie.title,
          genre: movie.genre,
          rating: movie.rating,
          director: movie.director,
          description: movie.description
        },
        reason: `Matches your preferences for ${movie.matchedGenres.join(', ')} with a ${movie.rating} rating.`
      }));

    res.json({
      user: user.name,
      preferences: user.preferences,
      recommendations: topRecommendations
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