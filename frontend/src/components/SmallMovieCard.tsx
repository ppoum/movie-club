import type { Movie } from "../types/ApiTypes";

export default function SmallMovieCard({
  movie,
  onClick,
}: {
  movie: Movie;
  onClick: (m: Movie) => void;
}) {
  return (
    <div
      className="movie-card small"
      onClick={() => onClick(movie)}
      style={{ cursor: "pointer" }}
    >
      <div className="poster-container">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster"
        />
      </div>
      <div className="movie-title">
        <strong>{movie.title}</strong> ({movie.year})
      </div>
    </div>
  );
}
