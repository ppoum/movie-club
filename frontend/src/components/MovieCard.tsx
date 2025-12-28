import { getAverageClubRating, type Movie } from "../types/ApiTypes";

export default function MovieCard({
  movie,
  onClick,
}: {
  movie: Movie;
  onClick: (m: Movie) => void;
}) {
  const clubRating = getAverageClubRating(movie);
  return (
    <div
      className="movie-card"
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
        <strong>{movie.title}</strong> ({movie.year})<br />
      </div>
      <div className="movie-rating">
        Club Rating: {clubRating === null ? "N/A" : clubRating.toFixed(2)} (
        {movie.avg_rating})
      </div>
    </div>
  );
}
