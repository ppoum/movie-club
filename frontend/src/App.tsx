import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import "./ClubPage.css";
import "./MembersPage.css";

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

/* ================= HELPERS ================= */

function getAverageClubRating(movie: Movie): number | null {
  const ratings = Object.values(movie.club_ratings).filter(
    (r): r is number => r !== null,
  );
  if (!ratings.length) return null;
  const sum_ratings = ratings.reduce((sum, r) => sum + r, 0);
  return sum_ratings / (2 * ratings.length);
}

function getAverageMemberRating(data: Movie[], username: string): number | null {
  const ratings: number[] = data
    .map((movie) => movie.club_ratings[username])
    .filter((r): r is number => r !== null);
  if (!ratings.length) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return sum / (2 * ratings.length);
}

function getTop3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .filter(movie => {
      const rating = getAverageClubRating(movie);
      return rating !== null && rating !== 0;
    })
    .sort((a, b) => {
      const ratingA = getAverageClubRating(a) as number;
      const ratingB = getAverageClubRating(b) as number;
      return ratingB - ratingA;
    })
    .slice(0, 3);
}

function getBottom3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .filter(movie => {
      const rating = getAverageClubRating(movie);
      return rating !== null && rating !== 0;
    })
    .sort((a, b) => {
      const ratingA = getAverageClubRating(a) as number;
      const ratingB = getAverageClubRating(b) as number;
      return ratingA - ratingB;
    })
    .slice(0, 3);
}

function GetTotalRuntime(movies: Movie[]): number {
  return movies.reduce((total, movie) => total + movie.runtime, 0);
}

function GetLongestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((longest, movie) => (movie.runtime > longest.runtime ? movie : longest));
}

function GetShortestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((shortest, movie) => (movie.runtime < shortest.runtime ? movie : shortest));
}

function GetNewestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((newest, movie) => (movie.year > newest.year ? movie : newest));
}

function GetOldestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((oldest, movie) => (movie.year < oldest.year ? movie : oldest));
}

function GetMembersData(data: Movie[]) {
  const members: Record<string, { username: string; lowestRatingMovie: string | null; highestRatingMovie: string | null }> = {};
  data.forEach((movie) => {
    Object.entries(movie.club_ratings).forEach(([username, rating]) => {
      if (!members[username]) {
        members[username] = { username, lowestRatingMovie: rating !== null ? movie.slug : null, highestRatingMovie: rating !== null ? movie.slug : null };
      } else if (rating !== null) {
        const currentLowestSlug = members[username].lowestRatingMovie;
        const currentLowestRating = data.find((m) => m.slug === currentLowestSlug)?.club_ratings[username];
        if (currentLowestRating === undefined || rating < currentLowestRating) members[username].lowestRatingMovie = movie.slug;

        const currentHighestSlug = members[username].highestRatingMovie;
        const currentHighestRating = data.find((m) => m.slug === currentHighestSlug)?.club_ratings[username];
        if (currentHighestRating === undefined || rating > currentHighestRating) members[username].highestRatingMovie = movie.slug;
      }
    });
  });
  return Object.values(members);
}

function getMovieBySlug(data: Movie[], slug: string): Movie | null {
  return data.find((m) => m.slug === slug) ?? null;
}

function starify(rating: number | null): string {
  if (rating === null) return "N/A";
  const fullStars = Math.floor(rating / 2);
  const halfStar = rating / 2 - fullStars >= 0.5 ? "½" : "";
  return "★".repeat(fullStars) + halfStar;
}

/* ================= SHARED COMPONENTS ================= */

function MovieCard({ movie, onClick }: { movie: Movie; onClick: (m: Movie) => void }) {
  const clubRating = getAverageClubRating(movie);
  return (
    <div className="movie-card" onClick={() => onClick(movie)} style={{ cursor: "pointer" }}>
      <div className="poster-container">
        <img src={movie.poster_url} alt={movie.title} className="movie-poster" />
      </div>
      <div className="movie-title">
        <strong>{movie.title}</strong> ({movie.year})<br />
      </div>
      <div className="movie-rating">
        Club Rating: {clubRating === null ? "N/A" : clubRating.toFixed(2)} ({movie.avg_rating})
      </div>
    </div>
  );
}

function SmallMovieCard({ movie, onClick }: { movie: Movie; onClick: (m: Movie) => void }) {
  return (
    <div className="movie-card small" onClick={() => onClick(movie)} style={{ cursor: "pointer" }}>
      <div className="poster-container">
        <img src={movie.poster_url} alt={movie.title} className="movie-poster" />
      </div>
      <div className="movie-title">
        <strong>{movie.title}</strong> ({movie.year})
      </div>
    </div>
  );
}

function MovieModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <img src={movie.poster_url} alt={movie.title} className="modal-poster" />
          <div className="modal-details">
            <h2>{movie.title} ({movie.year})</h2>
            <p><strong>Director:</strong> {movie.director.name}</p>
            <p><strong>Runtime:</strong> {movie.runtime} minutes</p>
            <p><strong>Global Rating:</strong> {movie.avg_rating}</p>
            <p><strong>Club Rating:</strong> {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}</p>
            <p><strong>Cast:</strong></p>
            <ul>
              {movie.top_actors.slice(0, 5).map(actor => (
                <li key={actor.slug}>{actor.name} as <em>{actor.role_name}</em></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PAGE COMPONENTS ================= */

function MovieList({ data, onMovieClick }: { data: Movie[]; onMovieClick: (m: Movie) => void }) {
  return (
    <div className="movie-grid">
      {data.map((movie) => (
        <MovieCard key={movie.slug} movie={movie} onClick={onMovieClick} />
      ))}
    </div>
  );
}

function MembersPage({ data, onMovieClick }: { data: Movie[]; onMovieClick: (m: Movie) => void }) {
  const membersData = GetMembersData(data);
  return (
    <div className="members-grid">
      {membersData.map((member) => {
        const lowestMovie = member.lowestRatingMovie ? getMovieBySlug(data, member.lowestRatingMovie) : null;
        const highestMovie = member.highestRatingMovie ? getMovieBySlug(data, member.highestRatingMovie) : null;
        const averageRating = getAverageMemberRating(data, member.username);

        return (
          <div className="member-section" key={member.username}>
            <h2>{member.username}</h2>
            <div className="member-cards">
              <div className="member-card">
                <h3>Highest Rating</h3>
                {highestMovie ? (
                  <>
                    <SmallMovieCard movie={highestMovie} onClick={onMovieClick} />
                    <p style={{ paddingTop: "1rem" }}>{starify(highestMovie.club_ratings[member.username])}</p>
                  </>
                ) : <p>No highest rated movie yet</p>}
              </div>
              <div className="member-card">
                <h3>Lowest Rating</h3>
                {lowestMovie ? (
                  <>
                    <SmallMovieCard movie={lowestMovie} onClick={onMovieClick} />
                    <p style={{ paddingTop: "1rem" }}>{starify(lowestMovie.club_ratings[member.username])}</p>
                  </>
                ) : <p>No lowest rated movie yet</p>}
              </div>
            </div>
            <div className="member-average">
              <h3>Average Rating</h3>
              <p>{averageRating !== null ? averageRating.toFixed(2) : "N/A"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClubPage({ data, onMovieClick }: { data: Movie[]; onMovieClick: (m: Movie) => void }) {
  const top3Movies = getTop3Movies(data);
  const bottom3Movies = getBottom3Movies(data);
  const totalRuntime = GetTotalRuntime(data);
  const longestMovie = GetLongestRuntime(data);
  const shortestMovie = GetShortestRuntime(data);
  const newestMovie = GetNewestMovie(data);
  const oldestMovie = GetOldestMovie(data);

  return (
    <div className="club-page">
      <div className="club-stats">
        <div className="stat-section">
          <h2>Top 3 Highest Rated Movies</h2>
          <div className="podium">
            {top3Movies.map((movie, index) => (
              <div key={movie.slug} className={`podium-item ${index === 0 ? "first" : index === 1 ? "second" : "third"}`} onClick={() => onMovieClick(movie)} style={{cursor: 'pointer'}}>
                <div className="podium-rank">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</div>
                <strong className="movie-title">{movie.title}</strong>
                <div className="movie-rating">Club: {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-section">
          <h2>Top 3 Lowest Rated Movies</h2>
          <div className="podium">
            {bottom3Movies.map((movie, index) => (
              <div key={movie.slug} className={`podium-item ${index === 0 ? "first" : index === 1 ? "second" : "third"}`} onClick={() => onMovieClick(movie)} style={{cursor: 'pointer'}}>
                <div className="podium-rank">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</div>
                <strong className="movie-title">{movie.title}</strong>
                <div className="movie-rating">Club: {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-section">
          <h2>Viewing Stats</h2>
          <div className="stat-cards">
            <div className="stat-card" style={{ width: "150px" }}>
              <h3>Movies Watched</h3>
              <p>{data.length}</p>
            </div>
            <div className="stat-card" style={{ width: "150px" }}>
              <h3>Total Runtime</h3>
              <p>{Math.round(totalRuntime / 60)} hours</p>
            </div>
          </div>

          <div style={{ height: "2rem" }} />
          <div className="stat-cards">
            {shortestMovie && (
              <div className="stat-card">
                <h3>Shortest</h3>
                <SmallMovieCard movie={shortestMovie} onClick={onMovieClick} />
                <p style={{ paddingTop: "1rem" }}>{shortestMovie.runtime} min</p>
              </div>
            )}
            {longestMovie && (
              <div className="stat-card">
                <h3>Longest</h3>
                <SmallMovieCard movie={longestMovie} onClick={onMovieClick} />
                <p style={{ paddingTop: "1rem" }}>{longestMovie.runtime} min</p>
              </div>
            )}
          </div>

          <div style={{ height: "2rem" }} />
          <div className="stat-cards">
            {oldestMovie && (
              <div className="stat-card">
                <h3>Oldest</h3>
                <SmallMovieCard movie={oldestMovie} onClick={onMovieClick} />
              </div>
            )}
            {newestMovie && (
              <div className="stat-card">
                <h3>Newest</h3>
                <SmallMovieCard movie={newestMovie} onClick={onMovieClick} />
              </div>
            )}
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
          <li><Link to="/" className="nav-link">Movies</Link></li>
          <li><Link to="/members" className="nav-link">Members</Link></li>
          <li><Link to="/club" className="nav-link">Club</Link></li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<MovieList data={data} onMovieClick={setSelectedMovie} />} />
        <Route path="/members" element={<MembersPage data={data} onMovieClick={setSelectedMovie} />} />
        <Route path="/club" element={<ClubPage data={data} onMovieClick={setSelectedMovie} />} />
      </Routes>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </>
  );
}

export default App;