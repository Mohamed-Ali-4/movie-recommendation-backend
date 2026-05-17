const { HfInference } = require('@huggingface/inference');
const tmdb = require('./tmdb');

const hf = process.env.HUGGINGFACE_API_KEY
  ? new HfInference(process.env.HUGGINGFACE_API_KEY)
  : null;

// Keyword lexicon: mood phrase -> TMDB genre name
const MOOD_KEYWORDS = {
  Comedy: ['funny', 'laugh', 'humor', 'humour', 'comedy', 'comedic', 'silly', 'lighthearted', 'light-hearted', 'feel-good', 'feel good', 'feelgood', 'cheerful', 'amusing', 'hilarious', 'witty'],
  Romance: ['romantic', 'romance', 'love story', 'dreamy', 'date night', 'cute couple', 'rom com', 'rom-com'],
  Horror: ['scary', 'horror', 'creepy', 'frightening', 'haunted', 'terrifying', 'spooky', 'chilling', 'gore'],
  Thriller: ['thriller', 'edge of my seat', 'edge-of-my-seat', 'suspense', 'tense', 'gripping', 'nail-biting', 'nailbiting'],
  Action: ['action', 'fight', 'explosion', 'adrenaline', 'pumped', 'energetic', 'high octane', 'high-octane', 'shootout'],
  Drama: ['drama', 'emotional', 'cry', 'heartbreaking', 'sad', 'tearjerker', 'tear-jerker', 'moving', 'serious', 'depressing', 'melancholy', 'heartfelt'],
  'Sci-Fi': ['sci-fi', 'scifi', 'science fiction', 'space', 'aliens', 'futuristic', 'mind-bending', 'mind bending', 'mindbending', 'cyberpunk', 'dystopian', 'time travel'],
  Fantasy: ['fantasy', 'magic', 'magical', 'wizard', 'dragon', 'mythical', 'enchanted', 'fairy tale', 'fairytale'],
  Adventure: ['adventure', 'journey', 'quest', 'explore', 'epic', 'exploration'],
  Animation: ['animated', 'animation', 'cartoon', 'pixar', 'disney', 'anime'],
  Mystery: ['mystery', 'detective', 'whodunit', 'puzzle', 'clue'],
  Crime: ['crime', 'heist', 'gangster', 'mafia', 'noir', 'robbery'],
  Documentary: ['documentary', 'true story', 'real life', 'real-life', 'docu'],
  Family: ['family', 'kids', 'children', 'wholesome', 'family-friendly', 'family friendly'],
  War: ['war', 'battle', 'military', 'soldier', 'wartime'],
  Western: ['western', 'cowboy', 'wild west'],
  History: ['historical', 'period piece', 'period drama', 'history']
};

function matchGenresByKeyword(moodText) {
  const text = ` ${moodText.toLowerCase()} `;
  const hits = [];
  for (const [genre, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(` ${kw} `) || text.includes(` ${kw},`) || text.includes(` ${kw}.`) || text.includes(`${kw} `)) {
        hits.push(genre);
        break;
      }
    }
  }
  return [...new Set(hits)].slice(0, 3);
}

async function classifyMoodWithHF(moodText) {
  if (!hf) return null;
  const labels = Object.keys(MOOD_KEYWORDS);
  try {
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: moodText,
      parameters: { candidate_labels: labels, multi_label: true }
    });

    let entries = [];
    if (Array.isArray(result) && result.length && typeof result[0] === 'object' && 'label' in result[0]) {
      entries = result.map(r => ({ label: r.label, score: r.score }));
    } else {
      const r = Array.isArray(result) ? result[0] : result;
      if (r && Array.isArray(r.labels) && Array.isArray(r.scores)) {
        entries = r.labels.map((label, i) => ({ label, score: r.scores[i] }));
      }
    }

    entries.sort((a, b) => b.score - a.score);
    const strong = entries.filter(e => e.score > 0.4).slice(0, 3).map(e => e.label);
    if (strong.length) return strong;
    return entries.slice(0, 2).map(e => e.label);
  } catch (err) {
    console.error('HF zero-shot error:', err.message);
    return null;
  }
}

async function recommendByMood(moodText) {
  let matchedGenres = matchGenresByKeyword(moodText);
  let classifier = matchedGenres.length ? 'keyword' : null;

  if (!matchedGenres.length) {
    const hfGenres = await classifyMoodWithHF(moodText);
    if (hfGenres && hfGenres.length) {
      matchedGenres = hfGenres;
      classifier = 'huggingface';
    }
  }

  const genreIds = matchedGenres
    .map(g => tmdb.GENRE_NAME_TO_ID[g.toLowerCase()])
    .filter(Boolean);

  let results = [];
  let source = 'discover';

  if (genreIds.length) {
    try {
      const data = await tmdb.discoverByGenre(genreIds.join(','), 1);
      results = data.results;
    } catch (err) {
      console.error('TMDB discover error:', err.message);
    }
  }

  if (!results.length) {
    try {
      const data = await tmdb.searchMovies(moodText, 1);
      results = data.results;
      source = 'search';
    } catch (err) {
      console.error('TMDB search error:', err.message);
    }
  }

  if (!results.length) {
    try {
      const data = await tmdb.listMovies('popular', 1);
      results = data.results;
      source = 'popular';
    } catch (err) {
      console.error('TMDB popular error:', err.message);
    }
  }

  return {
    mood: moodText,
    matchedGenres,
    classifier,
    source,
    results: results.slice(0, 12)
  };
}

module.exports = { recommendByMood, matchGenresByKeyword, classifyMoodWithHF };
