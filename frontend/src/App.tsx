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

function getAverageClubRating(movie: Movie): number | null {
  const ratings = Object.values(movie.club_ratings).filter(
    (r): r is number => r !== null,
  );

  if (!ratings.length) return null;

  const sum_ratings = ratings.reduce((sum, r) => sum + r, 0);

  // Ratings are stored as 1-10 instead of 1-5 floats, divide by 2
  return sum_ratings / (2 * ratings.length);
}

function getAverageMemberRating(
  data: Movie[],
  username: string,
): number | null {
  // Collect all ratings for this user that are not null
  const ratings: number[] = data
    .map((movie) => movie.club_ratings[username])
    .filter((r): r is number => r !== null);

  if (!ratings.length) return null;

  // Ratings are stored as 1-10 instead of 1-5, divide by 2
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return sum / (2 * ratings.length);
}

function getTop3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .sort((a, b) => {
      const clubRatingA = getAverageClubRating(a) ?? 0;
      const clubRatingB = getAverageClubRating(b) ?? 0;
      return clubRatingB - clubRatingA; // Sort in descending order
    })
    .slice(0, 3);
}

function getBottom3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .sort((a, b) => {
      const clubRatingA = getAverageClubRating(a) ?? 0;
      const clubRatingB = getAverageClubRating(b) ?? 0;
      return clubRatingA - clubRatingB; // Sort in ascending order
    })
    .slice(0, 3);
}

function GetTotalRuntime(movies: Movie[]): number {
  return movies.reduce((total, movie) => total + movie.runtime, 0);
}

function GetLongestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((longest, movie) => {
    return movie.runtime > longest.runtime ? movie : longest;
  });
}

function GetShortestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((shortest, movie) => {
    return movie.runtime < shortest.runtime ? movie : shortest;
  });
}

function GetNewestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((newest, movie) => {
    return movie.year > newest.year ? movie : newest;
  });
}

function GetOldestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((oldest, movie) => {
    return movie.year < oldest.year ? movie : oldest;
  });
}

function GetMembersData(data: Movie[]) {
  const members: Record<
    string,
    {
      username: string;
      lowestRatingMovie: string | null;
      highestRatingMovie: string | null;
    }
  > = {};

  data.forEach((movie) => {
    Object.entries(movie.club_ratings).forEach(([username, rating]) => {
      if (!members[username]) {
        members[username] = {
          username,
          lowestRatingMovie: rating !== null ? movie.slug : null,
          highestRatingMovie: rating !== null ? movie.slug : null,
        };
      } else if (rating !== null) {
        // Update lowest rating movie
        const currentLowestSlug = members[username].lowestRatingMovie;
        if (!currentLowestSlug) {
          members[username].lowestRatingMovie = movie.slug;
        } else {
          const currentLowestRating = data.find(
            (m) => m.slug === currentLowestSlug,
          )?.club_ratings[username];
          if (
            currentLowestRating !== undefined &&
            rating < currentLowestRating
          ) {
            members[username].lowestRatingMovie = movie.slug;
          }
        }

        // Update highest rating movie
        const currentHighestSlug = members[username].highestRatingMovie;
        if (!currentHighestSlug) {
          members[username].highestRatingMovie = movie.slug;
        } else {
          const currentHighestRating = data.find(
            (m) => m.slug === currentHighestSlug,
          )?.club_ratings[username];
          if (
            currentHighestRating !== undefined &&
            rating > currentHighestRating
          ) {
            members[username].highestRatingMovie = movie.slug;
          }
        }
      }
    });
  });

  return Object.values(members);
}

function getMovieBySlug(data: Movie[], slug: string): Movie | null {
  const movie = data.find((m) => m.slug === slug);
  return movie ?? null;
}

function starify(rating: number | null): string {
  if (rating === null) return "N/A";

  const fullStars = Math.floor(rating / 2);
  const halfStar = rating / 2 - fullStars >= 0.5 ? "½" : "";

  return "★".repeat(fullStars) + halfStar;
}

function MovieList({ data }: { data: Movie[] }) {
  return (
    <div className="movie-grid">
      {data.map((movie) => {
        const clubRating = getAverageClubRating(movie);
        return (
          <div className="movie-card" key={movie.slug}>
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
              Club Rating: {clubRating === null ? "N/A" : clubRating.toFixed(2)}{" "}
              ({movie.avg_rating})
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MembersPage({ data }: { data: Movie[] }) {
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
                    <div className="movie-card small" key={highestMovie.slug}>
                      <div className="poster-container">
                        <img
                          src={highestMovie.poster_url}
                          alt={highestMovie.title}
                          className="movie-poster"
                        />
                      </div>
                      <div className="movie-title">
                        <strong>{highestMovie.title}</strong> (
                        {highestMovie.year})<br />
                      </div>
                    </div>
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
                    <div className="movie-card small" key={lowestMovie.slug}>
                      <div className="poster-container">
                        <img
                          src={lowestMovie.poster_url}
                          alt={lowestMovie.title}
                          className="movie-poster"
                        />
                      </div>
                      <div className="movie-title">
                        <strong>{lowestMovie.title}</strong> ({lowestMovie.year}
                        )<br />
                      </div>
                    </div>
                    <p style={{ paddingTop: "1rem" }}>
                      {starify(lowestMovie.club_ratings[member.username])}
                    </p>
                  </>
                ) : (
                  <p>No lowest rated movie yet</p>
                )}
              </div>
            </div>

            {/* Average rating full-width bar */}
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

function ClubPage({ data }: { data: Movie[] }) {
  const top3Movies = getTop3Movies(data);
  const bottom3Movies = getBottom3Movies(data);
  const totalRuntime = GetTotalRuntime(data);
  const longestMovie = GetLongestRuntime(data);
  const shortestMovie = GetShortestRuntime(data);
  const newestMovie = GetNewestMovie(data);
  const oldestMovie = GetOldestMovie(data);

  return (
    <div className="club-page">
      {/* Banner */}
      {/* <div className="club-banner">
        <h1>Welcome to the Movie Club</h1>
        <p>Explore the stats and highlights of our club's movie ratings!</p>
      </div> */}

      {/* Stats Section */}
      <div className="club-stats">
        {/* Top 3 Highest Rated Movies */}
        <div className="stat-section">
          <h2>Top 3 Highest Rated Movies</h2>
          <div className="podium">
            {top3Movies.map((movie, index) => {
              const clubRating = getAverageClubRating(movie); // Calculate the average club rating
              return (
                <div
                  key={movie.slug}
                  className={`podium-item ${
                    index === 0 ? "first" : index === 1 ? "second" : "third"
                  }`}
                >
                  <div className="podium-rank">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <strong className="movie-title">{movie.title}</strong>
                  <div className="movie-rating">
                    Club Rating:{" "}
                    {clubRating === null ? "N/A" : clubRating.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Lowest Rated Movies */}
        <div className="stat-section">
          <h2>Top 3 Lowest Rated Movies</h2>
          <div className="podium">
            {bottom3Movies.map((movie, index) => {
              const clubRating = getAverageClubRating(movie); // Calculate the average club rating
              return (
                <div
                  key={movie.slug}
                  className={`podium-item ${
                    index === 0 ? "first" : index === 1 ? "second" : "third"
                  }`}
                >
                  <div className="podium-rank">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <strong className="movie-title">{movie.title}</strong>
                  <div className="movie-rating">
                    Club Rating:{" "}
                    {clubRating === null ? "N/A" : clubRating.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Viewing Stats Cards */}
        <div className="stat-section">
          <h2>Viewing Stats</h2>
          <div className="stat-cards">
            <div className="stat-card" style={{ width: "150px" }}>
              <h3>Movies Watched</h3>
              <p>{data.length}</p>
            </div>
            <div className="stat-card" style={{ width: "150px" }}>
              <h3>Total Runtime</h3>
              <p>{Math.round(totalRuntime)} minutes</p>
              <p>{Math.round(totalRuntime / 60)} hours</p>
            </div>
          </div>

          {/* Spacer between sections */}
          <div style={{ height: "2rem" }} />
          {shortestMovie && longestMovie && (
            <div className="stat-cards">
              <div className="stat-card">
                <h3>Shortest Runtime</h3>
                <div className="movie-card small" key={shortestMovie.slug}>
                  <div className="poster-container">
                    <img
                      src={shortestMovie.poster_url}
                      alt={shortestMovie.title}
                      className="movie-poster"
                    />
                  </div>
                  <div className="movie-title">
                    <strong>{shortestMovie.title}</strong> ({shortestMovie.year}
                    )<br />
                  </div>
                </div>
                <p style={{ paddingTop: "1rem" }}>
                  {shortestMovie.runtime} minutes
                </p>
              </div>

              <div className="stat-card">
                <h3>Longest Runtime</h3>
                <div className="movie-card small" key={longestMovie.slug}>
                  <div className="poster-container">
                    <img
                      src={longestMovie.poster_url}
                      alt={longestMovie.title}
                      className="movie-poster"
                    />
                  </div>
                  <div className="movie-title">
                    <strong>{longestMovie.title}</strong> ({longestMovie.year})
                    <br />
                  </div>
                </div>
                <p style={{ paddingTop: "1rem" }}>
                  {longestMovie.runtime} minutes
                </p>
              </div>
            </div>
          )}

          {/* Spacer between sections */}
          <div style={{ height: "2rem" }} />
          {oldestMovie && newestMovie && (
            <div className="stat-cards">
              <div className="stat-card">
                <h3>Oldest Movie</h3>
                <div className="movie-card small" key={oldestMovie.slug}>
                  <div className="poster-container">
                    <img
                      src={oldestMovie.poster_url}
                      alt={oldestMovie.title}
                      className="movie-poster"
                    />
                  </div>
                  <div className="movie-title">
                    <strong>{oldestMovie.title}</strong> ({oldestMovie.year})
                    <br />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <h3>Newest Movie</h3>
                <div className="movie-card small" key={newestMovie.slug}>
                  <div className="poster-container">
                    <img
                      src={newestMovie.poster_url}
                      alt={newestMovie.title}
                      className="movie-poster"
                    />
                  </div>
                  <div className="movie-title">
                    <strong>{newestMovie.title}</strong> ({newestMovie.year})
                    <br />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

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
        <Route path="/" element={<MovieList data={data} />} />
        <Route path="/members" element={<MembersPage data={data} />} />
        <Route path="/club" element={<ClubPage data={data} />} />
      </Routes>
    </>
  );
}

export default App;
