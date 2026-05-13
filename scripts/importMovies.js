const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

const CONFIG = {
  pages: 10,
  genresFilter: ['Action', 'Sci-Fi', 'Thriller', 'Drama', 'Fantasy', 'Horror', 'Comedy', 'Adventure', 'Romance', 'Crime', 'Mystery', 'Documentary'],
  delayBetweenRequests: 500
};

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

// Adult content keywords to filter out
const ADULT_KEYWORDS = [
  'xxx', 'porn', 'erotic', 'nude', 'naked', 'sex tape',
  'adult', 'playboy', 'penthouse', 'hustler', 'rated x',
  '18+', 'explicit', 'uncensored'
];

function isAdultContent(movie) {
  if (movie.adult === true) return true;
  
  const title = movie.title?.toLowerCase() || '';
  const overview = movie.overview?.toLowerCase() || '';
  
  return ADULT_KEYWORDS.some(keyword => 
    title.includes(keyword) || overview.includes(keyword)
  );
}

async function getMovieFromOMDb(title, year) {
  try {
    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&y=${year}`
    );
    
    if (response.data.Response === 'True') {
      // Skip adult rated movies
      const rating = response.data.Rated;
      if (rating === 'NC-17' || rating === 'X') return 'ADULT';
      
      return {
        director: response.data.Director !== 'N/A' ? response.data.Director : 'Unknown',
        cast: response.data.Actors && response.data.Actors !== 'N/A'
          ? response.data.Actors.split(', ').slice(0, 5)
          : [],
        plot: response.data.Plot !== 'N/A' ? response.data.Plot : null,
        rated: response.data.Rated
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

async function removeAdultMovies() {
  console.log('\n🧹 Removing adult movies from database...');
  
  const allMovies = await Movie.find();
  let removed = 0;
  
  for (const movie of allMovies) {
    const title = movie.title?.toLowerCase() || '';
    const desc = movie.description?.toLowerCase() || '';
    
    if (ADULT_KEYWORDS.some(k => title.includes(k) || desc.includes(k))) {
      await Movie.findByIdAndDelete(movie._id);
      console.log(`   🗑️  Removed: ${movie.title}`);
      removed++;
    }
  }
  
  console.log(`   ✅ Removed ${removed} adult movies\n`);
}

async function importMoviesFromTMDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // First remove any existing adult movies
    await removeAdultMovies();

    console.log('⚙️  Configuration:');
    console.log(`   Pages: ${CONFIG.pages} (${CONFIG.pages * 20} movies max)`);
    console.log(`   Genres: ${CONFIG.genresFilter.join(', ')}\n`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFiltered = 0;
    let totalAdult = 0;

    // Import from multiple categories
    const categories = [
      'popular',
      'top_rated',
      'now_playing'
    ];

    for (const category of categories) {
      console.log(`\n🎬 Importing ${category} movies...`);

      for (let page = 1; page <= CONFIG.pages; page++) {
        console.log(`\n📄 Page ${page}/${CONFIG.pages}...`);

        const response = await axios.get(
          `https://api.themoviedb.org/3/movie/${category}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
        );

        const movies = response.data.results;

        for (const tmdbMovie of movies) {
          try {
            // Skip adult content immediately
            if (isAdultContent(tmdbMovie)) {
              console.log(`   🔞 Adult: ${tmdbMovie.title}`);
              totalAdult++;
              continue;
            }

            // Map genres
            const genres = tmdbMovie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);

            // Filter by genre
            if (!hasMatchingGenre(genres, CONFIG.genresFilter)) {
              totalFiltered++;
              continue;
            }

            // Check if movie already exists
            const exists = await Movie.findOne({ title: tmdbMovie.title });
            if (exists) {
              totalSkipped++;
              continue;
            }

            // Get additional details from OMDb
            const year = tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : null;
            const omdbData = await getMovieFromOMDb(tmdbMovie.title, year);

            // Skip if OMDb says adult
            if (omdbData === 'ADULT') {
              console.log(`   🔞 Adult (OMDb): ${tmdbMovie.title}`);
              totalAdult++;
              continue;
            }

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
            console.log(`   ✅ ${tmdbMovie.title} (${genres.join(', ')}) - ${newMovie.rating}⭐`);
            totalImported++;

            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));

          } catch (error) {
            console.error(`   ❌ Error: ${tmdbMovie.title}:`, error.message);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Imported:  ${totalImported} movies`);
    console.log(`⏭️  Skipped:   ${totalSkipped} duplicates`);
    console.log(`🔍 Filtered:  ${totalFiltered} wrong genre`);
    console.log(`🔞 Blocked:   ${totalAdult} adult content`);
    console.log(`📁 Total DB:  ${await Movie.countDocuments()} movies`);
    console.log('='.repeat(60));

    mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    mongoose.connection.close();
  }
}

importMoviesFromTMDb();