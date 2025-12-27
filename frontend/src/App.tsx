import { useEffect, useState } from "react";
import "./App.css";

type Movie = {
  slug: string;
  poster_url: string;
  title: string;
  year: number;
  runtime: number;
  avg_rating: number;
  director: Director;
  top_actors: Actor[];
  club_ratings: Record<string, number | null>;
};

function getAverageClubRating(movie: Movie): number | null {
  const ratings = Object.values(movie.club_ratings).filter(
    (r): r is number => r !== null,
  );

  if (!ratings.length) return null;

  const sum_ratings = ratings.reduce((sum, r) => sum + r, 0);

  // Ratings are stored as 1-10 instead of 1-5 floats, divide by 2
  return sum_ratings / (2 * ratings.length);
}

type Director = {
  slug: string;
  name: string;
  url: string;
};

type Actor = {
  slug: string;
  name: string;
  role_name: string;
};

function App() {
  const [data, setData] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

        const json: Movie[] = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    fetch_data();
  }, []);

  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <h1>Movie list</h1>
      <div className="movie-grid">
        {data.map((movie) => {
          const clubRating = getAverageClubRating(movie);
          return (
            <div className="movie-card">
              <div className="poster-container">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="movie-poster"
                />
              </div>
              <div className="movie-title">
                <strong>{movie.title}</strong> ({movie.year})<br />
              </div>
              <div className="movie-rating">
                Club Rating:{" "}
                {clubRating === null ? "N/A" : clubRating.toFixed(2)} (
                {movie.avg_rating})
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default App;
