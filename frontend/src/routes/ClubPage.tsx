import SmallMovieCard from "../components/SmallMovieCard";
import {
  getAverageClubRating,
  getBottom3Movies,
  GetLongestRuntime,
  GetNewestMovie,
  GetOldestMovie,
  GetShortestRuntime,
  getTop3Movies,
  GetTotalRuntime,
  type Movie,
} from "../types/ApiTypes";

export default function ClubPage({
  data,
  onMovieClick,
}: {
  data: Movie[];
  onMovieClick: (m: Movie) => void;
}) {
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
              <div
                key={movie.slug}
                className={`podium-item ${index === 0 ? "first" : index === 1 ? "second" : "third"}`}
                onClick={() => onMovieClick(movie)}
                style={{ cursor: "pointer" }}
              >
                <div className="podium-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>
                <strong className="movie-title">{movie.title}</strong>
                <div className="movie-rating">
                  Club: {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-section">
          <h2>Top 3 Lowest Rated Movies</h2>
          <div className="podium">
            {bottom3Movies.map((movie, index) => (
              <div
                key={movie.slug}
                className={`podium-item ${index === 0 ? "first" : index === 1 ? "second" : "third"}`}
                onClick={() => onMovieClick(movie)}
                style={{ cursor: "pointer" }}
              >
                <div className="podium-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>
                <strong className="movie-title">{movie.title}</strong>
                <div className="movie-rating">
                  Club: {getAverageClubRating(movie)?.toFixed(2) ?? "N/A"}
                </div>
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
                <p style={{ paddingTop: "1rem" }}>
                  {shortestMovie.runtime} min
                </p>
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
