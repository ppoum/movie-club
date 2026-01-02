import SmallMovieCard from "../components/SmallMovieCard";
import {
  getAverageMemberRating,
  GetMembersData,
  getMovieBySlug,
  starify,
  type Movie,
} from "../types/ApiTypes";
import "./MembersPage.css";

export default function MembersPage({
  data,
  onMovieClick,
}: {
  data: Movie[];
  onMovieClick: (m: Movie) => void;
}) {
  const membersData = GetMembersData(data);
  return (
    <div className="members-grid">
      {membersData.map((member) => {
        const lowestMovie = member.lowestRatingMovie
          ? getMovieBySlug(data, member.lowestRatingMovie)
          : null;
        const highestMovie = member.highestRatingMovie
          ? getMovieBySlug(data, member.highestRatingMovie)
          : null;
        const averageRating = getAverageMemberRating(data, member.username);

        return (
          <div className="member-section" key={member.username}>
            <h2>{member.username}</h2>
            <div className="member-cards">
              <div className="member-card">
                <h3>Highest Rating</h3>
                {highestMovie ? (
                  <>
                    <SmallMovieCard
                      movie={highestMovie}
                      onClick={onMovieClick}
                    />
                    <p style={{ paddingTop: "1rem" }}>
                      {starify(highestMovie.club_ratings[member.username])}
                    </p>
                  </>
                ) : (
                  <p>No highest rated movie yet</p>
                )}
              </div>
              <div className="member-card">
                <h3>Lowest Rating</h3>
                {lowestMovie ? (
                  <>
                    <SmallMovieCard
                      movie={lowestMovie}
                      onClick={onMovieClick}
                    />
                    <p style={{ paddingTop: "1rem" }}>
                      {starify(lowestMovie.club_ratings[member.username])}
                    </p>
                  </>
                ) : (
                  <p>No lowest rated movie yet</p>
                )}
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
