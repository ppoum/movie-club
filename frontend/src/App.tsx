import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import MembersPage from "./routes/MembersPage";
import { type Movie } from "./types/DataTypes";
import ClubPage from "./routes/ClubPage";
import MoviesPage from "./routes/MoviesPage";
import MovieModal from "./components/MovieModal";

/* ================= MAIN APP ================= */

function App() {
  const [data, setData] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  // Set to true when the modal should set the URL hash, false when it shouldn't modify the URL
  const [modalUsingHash, setModalUsingHash] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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

  // Update modal whenever the URL hash changes (or data refreshes)
  useEffect(() => {
    const slug = location.hash.substring(1); // Strip leading # from hash
    if (slug) {
      // Slug provided, try to find the movie it refers to in `data`
      const movie = data.find((m) => m.slug === slug);
      if (movie !== undefined) {
        setSelectedMovie(movie);
      } else {
        // No movie with that slug in data, clear
        setSelectedMovie(null);
      }
    } else {
      // No slug, clear the selected movie
      setSelectedMovie(null);
      setModalUsingHash(false);
    }
  }, [location.hash, data]);

  if (error) return <p>Error: {error}</p>;

  if (selectedMovie === null) {
    // No modal, allow scroll
    document.body.style.overflow = "unset";
  } else {
    document.body.style.overflow = "hidden";
  }

  function openModal(movie: Movie, useHash: boolean) {
    if (!useHash) {
      // Don't set URL hash
      setModalUsingHash(false);
      setSelectedMovie(movie);
      return;
    }

    setModalUsingHash(true);
    navigate(`#${movie.slug}`, { replace: true });
  }

  function closeModal() {
    if (modalUsingHash) {
      navigate("", { replace: true });
    } else {
      setSelectedMovie(null);
    }
  }

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
          element={
            <MoviesPage data={data} onMovieClick={(m) => openModal(m, true)} />
          }
        />
        <Route
          path="/members"
          element={
            <MembersPage
              data={data}
              onMovieClick={(m) => openModal(m, false)}
            />
          }
        />
        <Route
          path="/club"
          element={
            <ClubPage data={data} onMovieClick={(m) => openModal(m, false)} />
          }
        />
      </Routes>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={closeModal} />
      )}
    </>
  );
}

export default App;
