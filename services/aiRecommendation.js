const { HfInference } = require('@huggingface/inference');
const axios = require('axios');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Fetch trending movies from TMDb
async function getTrendingMovies() {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
    );
    return response.data.results.slice(0, 10);
  } catch (error) {
    console.error('TMDb API error:', error.message);
    return [];
  }
}

// Get movie details from OMDb
async function getOMDbRating(movieTitle, year) {
  try {
    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=${encodeURIComponent(movieTitle)}&y=${year}`
    );
    
    if (response.data.Response === 'True') {
      return {
        imdbRating: response.data.imdbRating || 'N/A',
        rottenTomatoes: response.data.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value || 'N/A',
        plot: response.data.Plot || 'N/A'
      };
    }
    return null;
  } catch (error) {
    console.error('OMDb API error:', error.message);
    return null;
  }
}

// Enrich local movies with external data
async function enrichMovieData(movies) {
  const enrichedMovies = [];
  
  for (const movie of movies) {
    const omdbData = await getOMDbRating(movie.title, movie.release_year);
    
    enrichedMovies.push({
      ...movie.toObject(),
      imdbRating: omdbData?.imdbRating || 'N/A',
      rottenTomatoes: omdbData?.rottenTomatoes || 'N/A',
      externalPlot: omdbData?.plot || movie.description
    });
  }
  
  return enrichedMovies;
}

// AI-powered recommendation using Hugging Face
async function getAIRecommendations(userPreferences, movies) {
  try {
    const movieList = movies.map(m => 
      `${m.title} (${m.genre.join(', ')}) - Rating: ${m.rating}, IMDb: ${m.imdbRating}`
    ).join('\n');
    
    const prompt = `You are a movie recommendation expert. 
User preferences: ${userPreferences.join(', ')}

Available movies:
${movieList}

Based on the user's preferences, recommend the top 3 movies and explain why each matches their taste. 
Format your response as JSON:
[
  {
    "title": "Movie Title",
    "reason": "Why this movie matches their preferences"
  }
]`;

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        return_full_text: false
      }
    });

    const aiText = response.generated_text;
    
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
    
  } catch (error) {
    console.error('Hugging Face API error:', error.message);
    return null;
  }
}

// Main recommendation function
async function generateSmartRecommendations(user, localMovies) {
  try {
    const enrichedMovies = await enrichMovieData(localMovies);
    
    const trendingMovies = await getTrendingMovies();
    
    const aiRecommendations = await getAIRecommendations(
      user.preferences,
      enrichedMovies
    );
    
    if (aiRecommendations && aiRecommendations.length > 0) {
      const recommendations = aiRecommendations.map(rec => {
        const movie = enrichedMovies.find(m => 
          m.title.toLowerCase() === rec.title.toLowerCase()
        );
        
        if (movie) {
          return {
            movie: {
              _id: movie._id,
              title: movie.title,
              genre: movie.genre,
              rating: movie.rating,
              imdbRating: movie.imdbRating,
              rottenTomatoes: movie.rottenTomatoes,
              director: movie.director,
              description: movie.externalPlot
            },
            reason: rec.reason,
            aiPowered: true
          };
        }
        return null;
      }).filter(Boolean);
      
      if (recommendations.length > 0) {
        return {
          recommendations,
          trending: trendingMovies.slice(0, 5).map(t => ({
            title: t.title,
            overview: t.overview,
            rating: t.vote_average,
            releaseDate: t.release_date
          }))
        };
      }
    }
    
    const scoredMovies = enrichedMovies.map(movie => {
      let score = 0;
      let matchedGenres = [];
      
      user.preferences.forEach(pref => {
        if (movie.genre.includes(pref)) {
          score += 3;
          matchedGenres.push(pref);
        }
      });
      
      score += parseFloat(movie.rating) || 0;
      if (movie.imdbRating !== 'N/A') {
        score += parseFloat(movie.imdbRating) || 0;
      }
      
      return { ...movie, score, matchedGenres };
    });
    
    const topRecommendations = scoredMovies
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(movie => ({
        movie: {
          _id: movie._id,
          title: movie.title,
          genre: movie.genre,
          rating: movie.rating,
          imdbRating: movie.imdbRating,
          rottenTomatoes: movie.rottenTomatoes,
          director: movie.director,
          description: movie.externalPlot
        },
        reason: `Matches your preferences for ${movie.matchedGenres.join(', ')} with ratings: Local ${movie.rating}/10, IMDb ${movie.imdbRating}`,
        aiPowered: false
      }));
    
    return {
      recommendations: topRecommendations,
      trending: trendingMovies.slice(0, 5).map(t => ({
        title: t.title,
        overview: t.overview,
        rating: t.vote_average,
        releaseDate: t.release_date
      }))
    };
    
  } catch (error) {
    console.error('Smart recommendations error:', error);
    throw error;
  }
}

module.exports = {
  generateSmartRecommendations,
  getTrendingMovies,
  getOMDbRating
};