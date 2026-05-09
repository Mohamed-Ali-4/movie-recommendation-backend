// AI Search for movies
router.post('/search', async (req, res) => {
  try {
    const { query, userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const movies = await Movie.find();

    // Simple search algorithm
    const searchResults = movies.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(query.toLowerCase());
      const genreMatch = movie.genre.some(g => g.toLowerCase().includes(query.toLowerCase()));
      const descMatch = movie.description.toLowerCase().includes(query.toLowerCase());
      
      return titleMatch || genreMatch || descMatch;
    });

    // Score results
    const scoredResults = searchResults.map(movie => {
      let score = 0;
      
      // Exact title match gets highest score
      if (movie.title.toLowerCase() === query.toLowerCase()) score += 100;
      // Partial title match
      if (movie.title.toLowerCase().includes(query.toLowerCase())) score += 50;
      // Genre match
      if (movie.genre.some(g => g.toLowerCase().includes(query.toLowerCase()))) score += 30;
      // Rating bonus
      score += movie.rating;
      
      return { ...movie.toObject(), searchScore: score };
    });

    // Sort by score
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

module.exports = router;