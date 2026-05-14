const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],

  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],

  watched: [{
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    rating: Number,
    watchedAt: Date
  }],

  moodPreferences: {
    type: [String],
    default: []
  },

  recentSearches: {
    type: [String],
    default: []
  },

  recommendationHistory: [{
    movies: [mongoose.Schema.Types.ObjectId],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]

}, { timestamps: true });

// FIX OVERWRITE MODEL ERROR
module.exports =
  mongoose.models.UserProfile ||
  mongoose.model('UserProfile', UserProfileSchema);