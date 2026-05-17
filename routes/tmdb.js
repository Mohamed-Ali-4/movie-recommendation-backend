const express = require('express');
const router = express.Router();
const tmdb = require('../services/tmdb');

function parsePage(value) {
  const page = parseInt(value);
  if (!page || page < 1) return 1;
  return Math.min(page, 500);
}

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'Missing search query (q)' });
    const data = await tmdb.searchMovies(q, parsePage(req.query.page));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/popular', async (req, res) => {
  try {
    res.json(await tmdb.listMovies('popular', parsePage(req.query.page)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    res.json(await tmdb.listMovies('top_rated', parsePage(req.query.page)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/now-playing', async (req, res) => {
  try {
    res.json(await tmdb.listMovies('now_playing', parsePage(req.query.page)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    res.json(await tmdb.listMovies('upcoming', parsePage(req.query.page)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/discover', async (req, res) => {
  try {
    const { genre } = req.query;
    if (!genre) return res.status(400).json({ message: 'Missing genre' });
    const genreId = isNaN(genre)
      ? tmdb.GENRE_NAME_TO_ID[String(genre).toLowerCase()]
      : parseInt(genre);
    if (!genreId) return res.status(400).json({ message: 'Invalid genre' });
    res.json(await tmdb.discoverByGenre(genreId, parsePage(req.query.page)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/genres', (req, res) => {
  res.json(
    Object.entries(tmdb.GENRE_MAP).map(([id, name]) => ({ id: parseInt(id), name }))
  );
});

router.get('/movie/:id', async (req, res) => {
  try {
    const data = await tmdb.getMovieDetails(req.params.id);
    if (!data) return res.status(404).json({ message: 'Movie not found' });
    res.json(data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
