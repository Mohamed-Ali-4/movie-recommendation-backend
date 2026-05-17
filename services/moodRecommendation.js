const { HfInference } = require('@huggingface/inference');
const tmdb = require('./tmdb');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const MOOD_LABELS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
  'War', 'Western'
];

async function classifyMoodToGenres(moodText) {
  try {
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: moodText,
      parameters: { candidate_labels: MOOD_LABELS, multi_label: true }
    });

    const r = Array.isArray(result) ? result[0] : result;
    if (!r || !Array.isArray(r.labels) || !Array.isArray(r.scores)) return null;

    const ranked = r.labels
      .map((label, i) => ({ label, score: r.scores[i] }))
      .sort((a, b) => b.score - a.score);

    const strong = ranked.filter(x => x.score > 0.4).slice(0, 3).map(x => x.label);
    if (strong.length) return strong;

    return ranked.slice(0, 2).map(x => x.label);
  } catch (err) {
    console.error('HF zero-shot error:', err.message);
    return null;
  }
}

async function recommendByMood(moodText) {
  const matchedGenres = await classifyMoodToGenres(moodText);

  const genreIds = (matchedGenres || [])
    .map(g => tmdb.GENRE_NAME_TO_ID[g.toLowerCase()])
    .filter(Boolean);

  let results = [];
  let source = 'discover';

  if (genreIds.length) {
    const data = await tmdb.discoverByGenre(genreIds.join(','), 1);
    results = data.results;
  }

  if (!results.length) {
    const data = await tmdb.searchMovies(moodText, 1);
    results = data.results;
    source = 'search';
  }

  return {
    mood: moodText,
    matchedGenres: matchedGenres || [],
    source,
    results: results.slice(0, 12)
  };
}

module.exports = { recommendByMood, classifyMoodToGenres };
