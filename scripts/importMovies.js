const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// Configuration
const CONFIG = {
  pages: 5, // Import from pages 1-5 (100 movies total)
  genresFilter: ['Action', 'Sci-Fi', 'Thriller', 'Drama', 'Fantasy', 'Horror', 'Comedy', 'Adventure', 'Romance', 'Crime', 'Mystery', 'Documentary'],
  delayBetweenRequests: 500 // milliseconds
};

// TMDb Genre ID to Name mapping
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

async function getMovieFromOMDb(title, year) {
  try {
    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&y=${year}`
    );
    
    if (response.data.Response === 'True') {
      return {
        director: response.data.Director !== 'N/A' ? response.data.Director : 'Unknown',
        cast: response.data.Actors && response.data.Actors !== 'N/A' 
          ? response.data.Actors.split(', ').slice(0, 5) 
          : [],
        plot: response.data.Plot !== 'N/A' ? response.data.Plot : null
      };
    }
    return null;
  } catch (error) {
    console.error(`OMDb error for ${title}:`, error.message);
    return null;
  }
}

function hasMatchingGenre(movieGenres, filterGenres) {
  return movieGenres.some(genre => filterGenres.includes(genre));
}

async function importMoviesFromTMDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('⚙️  Configuration:');
    console.log(`   Pages to import: ${CONFIG.pages} (${CONFIG.pages * 20} movies max)`);
    console.log(`   Genre filter: ${CONFIG.genresFilter.join(', ')}\n`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFiltered = 0;

    for (let page = 1; page <= CONFIG.pages; page++) {
      console.log(`\n📄 Processing page ${page}/${CONFIG.pages}...`);

      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
      );

      const movies = response.data.results;
      console.log(`   Found ${movies.length} movies on this page`);

      for (const tmdbMovie of movies) {
        try {
          // Map genres
          const genres = tmdbMovie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);

          // Filter by genre
          if (!hasMatchingGenre(genres, CONFIG.genresFilter)) {
            console.log(`   🔍 Filtered: ${tmdbMovie.title} (genres: ${genres.join(', ')})`);
            totalFiltered++;
            continue;
          }

          // Check if movie already exists
          const exists = await Movie.findOne({ title: tmdbMovie.title });
          if (exists) {
            console.log(`   ⏭️  Skipped: ${tmdbMovie.title} (already exists)`);
            totalSkipped++;
            continue;
          }

          // Get additional details from OMDb
          const year = tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : null;
          const omdbData = await getMovieFromOMDb(tmdbMovie.title, year);

          // Create new movie
          const newMovie = new Movie({
            title: tmdbMovie.title,
            genre: genres.length > 0 ? genres : ['Drama'],
            director: omdbData?.director || 'Unknown',
            cast: omdbData?.cast || [],
            release_year: year ? parseInt(year) : null,
            rating: parseFloat((tmdbMovie.vote_average || 0).toFixed(1)),
            description: omdbData?.plot || tmdbMovie.overview || 'No description available',
            poster_url: tmdbMovie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` 
              : null
          });

          await newMovie.save();
          console.log(`   ✅ Imported: ${tmdbMovie.title} (${genres.join(', ')}) - Rating: ${newMovie.rating}`);
          totalImported++;

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));

        } catch (error) {
          console.error(`   ❌ Error importing ${tmdbMovie.title}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${totalImported} movies`);
    console.log(`⏭️  Skipped (duplicates):  ${totalSkipped} movies`);
    console.log(`🔍 Filtered (genre):      ${totalFiltered} movies`);
    console.log(`📁 Total in database:     ${await Movie.countDocuments()} movies`);
    console.log('='.repeat(60) + '\n');

    mongoose.connection.close();
    console.log('✅ Done! Database connection closed.');

  } catch (error) {
    console.error('❌ Import failed:', error);
    mongoose.connection.close();
  }
}

// Run the import
importMoviesFromTMDb();