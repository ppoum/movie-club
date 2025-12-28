import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import MembersPage from "./routes/MembersPage";
import { type Movie } from "./types/ApiTypes";
import ClubPage from "./routes/ClubPage";
import MoviesPage from "./routes/MoviesPage";
import MovieModal from "./components/MovieModal";

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
