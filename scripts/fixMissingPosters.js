const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function getMoviePosterFromTMDb(movieTitle, releaseYear) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}&year=${releaseYear}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const movie = response.data.results[0];
      if (movie.poster_path) {
        return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`TMDb error for ${movieTitle}:`, error.message);
    return null;
  }
}

async function fixMissingPosters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const moviesWithoutPosters = await Movie.find({ 
      $or: [
        { poster_url: null },
        { poster_url: '' },
        { poster_url: undefined }
      ]
    });

    console.log(`🎬 Found ${moviesWithoutPosters.length} movies without posters\n`);

    let updated = 0;
    let notFound = 0;

    for (const movie of moviesWithoutPosters) {
      try {
        console.log(`🔍 Searching for: ${movie.title}...`);

        const posterUrl = await getMoviePosterFromTMDb(
          movie.title,
          movie.release_year
        );

        if (posterUrl) {
          await Movie.findByIdAndUpdate(movie._id, { poster_url: posterUrl });
          console.log(`✅ Added poster for: ${movie.title}`);
          updated++;
        } else {
          console.log(`❌ No poster found for: ${movie.title}`);
          notFound++;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Error updating ${movie.title}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 POSTER UPDATE SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Posters added: ${updated}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`📁 Total with posters: ${await Movie.countDocuments({ poster_url: { $ne: null, $ne: '' } })}`);
    console.log('='.repeat(50));

    mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

fixMissingPosters();