import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import MembersPage from "./routes/MembersPage";
import { getAverageClubRating, type Movie } from "./types/ApiTypes";
import ClubPage from "./routes/ClubPage";
import MoviesPage from "./routes/MoviesPage";

/* ================= SHARED COMPONENTS ================= */

function MovieModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="modal-poster"
          />
          <div className="modal-details">
            <h2>
              {movie.title} ({movie.year})
            </h2>
            <p>
              <strong>Director:</strong> {movie.director.name}
            </p>
            <p>
              <strong>Runtime:</strong> {movie.runtime} minutes
            </p>
            <p>
              <strong>Global Rating:</strong> {movie.avg_rating}
            </p>
            <p>
              <strong>Club Rating:</strong>{" "}
              {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}
            </p>
            <p>
              <strong>Cast:</strong>
            </p>
            <ul>
              {movie.top_actors.slice(0, 5).map((actor) => (
                <li key={actor.slug}>
                  {actor.name} as <em>{actor.role_name}</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN APP ================= */

function App() {
  const [data, setData] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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
      <nav className="navbar">
        <ul className="nav-links">
          <li>
            <Link to="/" className="nav-link">
              Movies
            </Link>
          </li>
          <li>
            <Link to="/members" className="nav-link">
              Members
            </Link>
          </li>
          <li>
            <Link to="/club" className="nav-link">
              Club
            </Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route
          path="/"
          element={<MoviesPage data={data} onMovieClick={setSelectedMovie} />}
        />
        <Route
          path="/members"
          element={<MembersPage data={data} onMovieClick={setSelectedMovie} />}
        />
        <Route
          path="/club"
          element={<ClubPage data={data} onMovieClick={setSelectedMovie} />}
        />
      </Routes>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}

export default App;
