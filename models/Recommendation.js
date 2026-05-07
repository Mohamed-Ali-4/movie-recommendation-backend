const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  score: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Recommendation', RecommendationSchema);