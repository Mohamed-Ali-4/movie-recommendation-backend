const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// GET all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().populate('user', 'name').populate('movie', 'title');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create review
router.post('/', async (req, res) => {
  try {
    const review = new Review(req.body);
    const savedReview = await review.save();
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE review
router.delete('/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;