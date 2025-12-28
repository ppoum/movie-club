import MovieCard from "../components/MovieCard";
import type { Movie } from "../types/ApiTypes";

export default function MoviesPage({
  data,
  onMovieClick,
}: {
  data: Movie[];
  onMovieClick: (m: Movie) => void;
}) {
  return (
    <div className="movie-grid">
      {data.map((movie) => (
        <MovieCard key={movie.slug} movie={movie} onClick={onMovieClick} />
      ))}
    </div>
  );
}
