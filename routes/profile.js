const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const Movie = require('../models/Movie');

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ user: req.params.userId })
      .populate('favorites', 'title poster_url rating')
      .populate('watchlist', 'title poster_url rating')
      .populate('watched.movie', 'title poster_url rating');
    
    if (!profile) {
      profile = new UserProfile({ user: req.params.userId });
      await profile.save();
    }
    
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add to favorites
router.post('/:userId/favorites/:movieId', async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ user: req.params.userId });
    if (!profile) {
      profile = new UserProfile({ user: req.params.userId });
    }

    if (!profile.favorites.includes(req.params.movieId)) {
      profile.favorites.push(req.params.movieId);
      await profile.save();
    }

    res.json({ message: 'Added to favorites', favorites: profile.favorites.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from favorites
router.delete('/:userId/favorites/:movieId', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.params.userId });
    profile.favorites = profile.favorites.filter(id => id.toString() !== req.params.movieId);
    await profile.save();

    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add to watchlist
router.post('/:userId/watchlist/:movieId', async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ user: req.params.userId });
    if (!profile) {
      profile = new UserProfile({ user: req.params.userId });
    }

    if (!profile.watchlist.includes(req.params.movieId)) {
      profile.watchlist.push(req.params.movieId);
      await profile.save();
    }

    res.json({ message: 'Added to watchlist', watchlist: profile.watchlist.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from watchlist
router.delete('/:userId/watchlist/:movieId', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.params.userId });
    profile.watchlist = profile.watchlist.filter(id => id.toString() !== req.params.movieId);
    await profile.save();

    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark as watched
router.post('/:userId/watched/:movieId', async (req, res) => {
  try {
    const { rating } = req.body;
    let profile = await UserProfile.findOne({ user: req.params.userId });
    if (!profile) {
      profile = new UserProfile({ user: req.params.userId });
    }

    profile.watched.push({
      movie: req.params.movieId,
      rating: rating || 0,
      watchedAt: new Date()
    });
    await profile.save();

    res.json({ message: 'Marked as watched' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save recent search
router.post('/:userId/recent-search', async (req, res) => {
  try {
    const { query } = req.body;
    let profile = await UserProfile.findOne({ user: req.params.userId });
    if (!profile) {
      profile = new UserProfile({ user: req.params.userId });
    }

    profile.recentSearches = [query, ...profile.recentSearches.filter(s => s !== query)].slice(0, 10);
    await profile.save();

    res.json(profile.recentSearches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;