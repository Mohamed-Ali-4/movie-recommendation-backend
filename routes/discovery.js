const express = require('express');
const router = express.Router();
const tmdb = require('../services/tmdb');

function parsePage(v) {
  const n = parseInt(v);
  return (!n || n < 1) ? 1 : Math.min(n, 500);
}

// Trending movies (week)
router.get('/trending', async (req, res) => {
  try {
    const axios = require('axios');
    const { data } = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${parsePage(req.query.page)}`
    );
    const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
    const GENRE_MAP = tmdb.GENRE_MAP;
    const results = (data.results || [])
      .filter(m => !m.adult)
      .map(m => ({
        tmdbId: m.id,
        title: m.title,
        description: m.overview || '',
        poster_url: m.poster_path ? `${POSTER_BASE}${m.poster_path}` : null,
        release_year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
        rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        genre: (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean)
      }));
    res.json({ page: data.page, total_pages: data.total_pages, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Discover by genre name or id
router.get('/genre/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    const genreId = isNaN(genre)
      ? tmdb.GENRE_NAME_TO_ID[genre.toLowerCase()]
      : parseInt(genre);
    if (!genreId) return res.status(400).json({ message: 'Unknown genre' });
    const data = await tmdb.discoverByGenre(genreId, parsePage(req.query.page));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
