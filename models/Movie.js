const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  genre: {
    type: [String],
    required: true
  },
  director: {
    type: String,
    trim: true
  },
  cast: {
    type: [String]
  },
  release_year: {
    type: Number
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  imdbRating: {
    type: String,
    default: 'N/A'
  },
  rottenTomatoes: {
    type: String,
    default: 'N/A'
  },
  description: {
    type: String,
    trim: true
  },
  poster_url: {
    type: String
  },
  backdrop_url: {
    type: String
  },
  trailer_url: {
    type: String
  },
  language: {
    type: String,
    default: 'English'
  },
  runtime: {
    type: Number
  },
  mood: {
    type: [String],
    enum: ['mind-bending', 'emotional', 'funny', 'dark', 'feel-good', 'action-packed', 'mysterious', 'romantic']
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isPopular: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Movie', MovieSchema);