const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('../models/Movie');

async function removeDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const allMovies = await Movie.find();
    console.log(`📊 Total movies before cleanup: ${allMovies.length}\n`);

    const titleMap = {};
    const duplicateIds = [];

    // Find duplicates
    for (const movie of allMovies) {
      const normalizedTitle = movie.title.toLowerCase().trim();

      if (titleMap[normalizedTitle]) {
        // This is a duplicate, keep the first one, mark this for deletion
        duplicateIds.push(movie._id);
        console.log(`🔄 Duplicate found: ${movie.title} (will be removed)`);
      } else {
        // First occurrence, keep it
        titleMap[normalizedTitle] = movie._id;
      }
    }

    // Remove duplicates
    let removed = 0;
    for (const id of duplicateIds) {
      try {
        const movie = await Movie.findByIdAndDelete(id);
        console.log(`🗑️  Removed duplicate: ${movie.title}`);
        removed++;
      } catch (error) {
        console.error(`Error removing duplicate:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DUPLICATE REMOVAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`🗑️  Total duplicates removed: ${removed}`);
    console.log(`✅ Remaining unique movies: ${await Movie.countDocuments()}`);
    console.log('='.repeat(60));

    mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

removeDuplicates();