export type Movie = {
  slug: string;
  poster_url: string;
  title: string;
  year: number;
  runtime: number;
  avg_rating: number;
  director: Director;
  top_actors: Actor[];
  club_ratings: Ratings;
};

export type Director = {
  slug: string;
  name: string;
  url: string;
};

export type Actor = {
  slug: string;
  name: string;
  role_name: string;
};

export type Ratings = Record<string, number | null>;

/* ================= HELPERS ================= */

/**
 * Returns the average club rating for a movie, ignoring users with no ratings.
 */
export function getAverageClubRating(movie: Movie): number | null {
  const ratings = Object.values(movie.club_ratings).filter(
    (r): r is number => r !== null,
  );
  if (!ratings.length) return null;
  const sum_ratings = ratings.reduce((sum, r) => sum + r, 0);
  return sum_ratings / (2 * ratings.length);
}

export function getAverageMemberRating(
  data: Movie[],
  username: string,
): number | null {
  const ratings: number[] = data
    .map((movie) => movie.club_ratings[username])
    .filter((r): r is number => r !== null);
  if (!ratings.length) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return sum / (2 * ratings.length);
}

export function getTop3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .filter((movie) => {
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

export function getBottom3Movies(movies: Movie[]): Movie[] {
  return [...movies]
    .filter((movie) => {
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

export function GetTotalRuntime(movies: Movie[]): number {
  return movies.reduce((total, movie) => total + movie.runtime, 0);
}

export function GetLongestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((longest, movie) =>
    movie.runtime > longest.runtime ? movie : longest,
  );
}

export function GetShortestRuntime(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((shortest, movie) =>
    movie.runtime < shortest.runtime ? movie : shortest,
  );
}

export function GetNewestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((newest, movie) =>
    movie.year > newest.year ? movie : newest,
  );
}

export function GetOldestMovie(movies: Movie[]): Movie | null {
  if (movies.length === 0) return null;
  return movies.reduce((oldest, movie) =>
    movie.year < oldest.year ? movie : oldest,
  );
}

export function GetMembersData(data: Movie[]) {
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
        const currentLowestSlug = members[username].lowestRatingMovie;
        const currentLowestRating = data.find(
          (m) => m.slug === currentLowestSlug,
        )?.club_ratings[username];
        if (currentLowestRating == null || rating < currentLowestRating)
          members[username].lowestRatingMovie = movie.slug;

        const currentHighestSlug = members[username].highestRatingMovie;
        const currentHighestRating = data.find(
          (m) => m.slug === currentHighestSlug,
        )?.club_ratings[username];
        if (currentHighestRating == null || rating > currentHighestRating)
          members[username].highestRatingMovie = movie.slug;
      }
    });
  });
  return Object.values(members);
}

export function getMovieBySlug(data: Movie[], slug: string): Movie | null {
  return data.find((m) => m.slug === slug) ?? null;
}

/**
 * Converts a float value between 1 and 10 to a star notation
 * (with the following characters: ★, ⯪ and ☆)
 */
export function starify(rating: number | null): string {
  if (rating === null) rating = 0;
  const fullStars = Math.floor(rating / 2);
  const hasHalfStar = Math.round(rating) % 2 >= 1;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  let stars = "★".repeat(fullStars);
  if (hasHalfStar) stars += "⯪";
  stars += "☆".repeat(emptyStars);
  return stars;
}
