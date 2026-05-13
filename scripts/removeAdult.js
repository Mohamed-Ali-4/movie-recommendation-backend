const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// More comprehensive adult content keywords
const ADULT_KEYWORDS = [
  'xxx', 'porn', 'sex', 'erotic', 'nude', 'naked', 'adult film',
  'playboy', 'penthouse', 'rated x', 'explicit', 'uncensored',
  'strip', 'stripper', 'prostitute', 'escort', 'call girl',
  'seduction', 'desire', 'lust', 'affairs', 'temptation',
  'sensual', 'naughty', 'dirty', 'kinky', 'fetish',
  'hardcore', 'softcore', 'intimate scene', 'passion',
  'erection', 'orgasm', 'sexual content', 'adult content',
  'mature content', 'age restricted', 'x rated'
];

async function checkTMDbAdult(movieTitle, releaseYear) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}&year=${releaseYear}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const movie = response.data.results[0];
      return movie.adult === true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function removeAdultMovies() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const allMovies = await Movie.find();
    console.log(`📊 Total movies: ${allMovies.length}\n`);
    console.log('🔍 Scanning for adult content...\n');

    let removed = 0;
    const removedMovies = [];

    for (const movie of allMovies) {
      const title = movie.title?.toLowerCase() || '';
      const desc = movie.description?.toLowerCase() || '';

      // Check by keywords
      const hasAdultKeyword = ADULT_KEYWORDS.some(k =>
        title.includes(k) || desc.includes(k)
      );

      // Check by TMDb adult flag
      let isAdultTMDb = false;
      try {
        isAdultTMDb = await checkTMDbAdult(movie.title, movie.release_year);
      } catch (e) {
        // Continue if TMDb check fails
      }

      if (hasAdultKeyword || isAdultTMDb) {
        await Movie.findByIdAndDelete(movie._id);
        removedMovies.push(movie.title);
        console.log(`🗑️  Removed: ${movie.title}`);
        removed++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`🗑️  Total removed: ${removed} adult movies`);
    console.log(`✅ Remaining movies: ${await Movie.countDocuments()}`);

    if (removedMovies.length > 0) {
      console.log('\n🗑️  Removed movies:');
      removedMovies.forEach(title => console.log(`   - ${title}`));
    }

    console.log('='.repeat(60));

    mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

removeAdultMovies();