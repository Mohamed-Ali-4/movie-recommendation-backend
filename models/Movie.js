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
  description: {
    type: String,
    trim: true
  },
  poster_url: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Movie', MovieSchema);