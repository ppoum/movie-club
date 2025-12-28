import { getAverageClubRating, type Movie } from "../types/ApiTypes";
import "./MovieModal.css";

export default function MovieModal({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
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
