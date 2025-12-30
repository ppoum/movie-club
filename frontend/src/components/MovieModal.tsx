import { getAverageClubRating, starify, type Movie } from "../types/ApiTypes";
import "./MovieModal.css";

export default function MovieModal({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
  const avgClubRating = getAverageClubRating(movie);
  const clubRatings = movie.club_ratings;
  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-div" onClick={(e) => e.stopPropagation()}>
          <span className="modal-close" onClick={onClose}>
            &times;
          </span>
          <div className="modal-left">
            <img
              className="modal-poster"
              alt="{movie.title} poster"
              src={movie.poster_url}
            />
          </div>
          <div className="modal-right">
            <h2 className="modal-title">{movie.title}</h2>
            <p className="modal-year">{movie.year}</p>

            <div className="modal-info-section">
              <div className="modal-info-item">
                <span className="modal-info-label">Director:</span>
                <span>{movie.director.name}</span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Runtime:</span>
                <span>{movie.runtime} minutes</span>
              </div>
              {/* TODO: Add full release date? */}
            </div>

            <div className="modal-ratings-section">
              <RatingBox title="Global Rating" rating={movie.avg_rating} />
              <RatingBox title="Club Rating" rating={avgClubRating} />
            </div>

            <div className="modal-cast-section">
              <h3>Cast</h3>
              <div className="modal-cast-list">
                {movie.top_actors.map((actor) => (
                  <div className="focus-box">
                    <p className="modal-cast-name">{actor.name}</p>
                    <p className="modal-cast-role">{actor.role_name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-club-section">
              <h3>Club Members</h3>
              <div className="modal-club-list">
                {Object.entries(clubRatings).map(([name, rating]) => (
                  <ClubRatingBox name={name} rating={rating}></ClubRatingBox>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type RatingBoxProps = {
  title: string;
  rating: number | null;
};
function RatingBox({ title, rating }: RatingBoxProps) {
  return (
    <>
      <div className="modal-ratings-highlight-box">
        <p className="modal-ratings-title">{title}</p>
        <div className="modal-ratings-values">
          {rating !== null && (
            <span className="modal-ratings-stars">{starify(rating * 2)}</span>
          )}
          <span className="modal-ratings-number">
            {rating !== null ? rating.toFixed(2) : "N/A"}
          </span>
        </div>
      </div>
    </>
  );
}

type ClubRatingBoxProps = {
  name: string;
  rating: number | null;
};
function ClubRatingBox({ name, rating }: ClubRatingBoxProps) {
  let score;
  if (rating === null) {
    score = (
      <div className="modal-club-rating-score">
        <span className="modal-club-rating-number">N/A</span>
      </div>
    );
  } else {
    score = (
      <div className="modal-club-rating-score">
        <span className="modal-club-rating-stars">{starify(rating)}</span>
        <span className="modal-club-rating-number">
          {(rating / 2).toFixed(1)}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="modal-club-rating-box focus-box">
        <p className="modal-club-rating-name">{name}</p>
        {score}
      </div>
    </>
  );
}
