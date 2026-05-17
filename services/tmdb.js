const axios = require('axios');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const GENRE_NAME_TO_ID = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name.toLowerCase(), parseInt(id)])
);

function mapListItem(m) {
  return {
    tmdbId: m.id,
    title: m.title,
    description: m.overview || '',
    poster_url: m.poster_path ? `${POSTER_BASE}${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${BACKDROP_BASE}${m.backdrop_path}` : null,
    release_year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
    rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
    genre: (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean)
  };
}

async function tmdbGet(path, params = {}) {
  const { data } = await axios.get(`${TMDB_BASE}${path}`, {
    params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', ...params },
    timeout: 10000
  });
  return data;
}

function wrapList(data) {
  return {
    page: data.page,
    total_pages: Math.min(data.total_pages, 500),
    total_results: data.total_results,
    results: (data.results || []).filter(m => !m.adult).map(mapListItem)
  };
}

async function searchMovies(query, page = 1) {
  const data = await tmdbGet('/search/movie', { query, page, include_adult: false });
  return wrapList(data);
}

async function listMovies(category, page = 1) {
  const data = await tmdbGet(`/movie/${category}`, { page });
  return wrapList(data);
}

async function discoverByGenre(genreId, page = 1) {
  const data = await tmdbGet('/discover/movie', {
    with_genres: genreId,
    page,
    include_adult: false,
    sort_by: 'popularity.desc'
  });
  return wrapList(data);
}

async function getMovieDetails(id) {
  const data = await tmdbGet(`/movie/${id}`, { append_to_response: 'credits,videos' });
  if (data.adult) return null;

  const director = data.credits?.crew?.find(p => p.job === 'Director')?.name || 'Unknown';
  const cast = (data.credits?.cast || []).slice(0, 8).map(c => c.name);
  const trailer = (data.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

  return {
    tmdbId: data.id,
    title: data.title,
    description: data.overview || '',
    poster_url: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
    backdrop_url: data.backdrop_path ? `${BACKDROP_BASE}${data.backdrop_path}` : null,
    release_year: data.release_date ? parseInt(data.release_date.split('-')[0]) : null,
    rating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 0,
    runtime: data.runtime,
    genre: (data.genres || []).map(g => g.name),
    director,
    cast,
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    language: data.original_language,
    tagline: data.tagline || ''
  };
}

module.exports = {
  searchMovies,
  listMovies,
  discoverByGenre,
  getMovieDetails,
  GENRE_MAP,
  GENRE_NAME_TO_ID
};
