import argparse
import json
import logging
import os
from dataclasses import asdict, dataclass, field
import sys
from typing import Dict, List, Optional, Tuple

from letterboxdpy.list import List as LBoxList
from letterboxdpy.movie import Movie
from letterboxdpy.user import User

logger = logging.getLogger("letterboxd-scrape")


def get_user_film_ratings(username: str) -> List[Tuple[str, Optional[int]]]:
    user_instance = User(username)
    user_films = user_instance.get_films()["movies"]

    result = []
    for k, v in user_films.items():
        slug = k
        rating = v.get("rating")
        result.append((slug, rating))
    return result


@dataclass
class ActorInfo:
    slug: str
    name: str
    role_name: str


@dataclass
class MovieInfo:
    slug: str
    poster_url: str
    title: str
    year: int
    runtime: int
    avg_rating: float
    director: str
    top_actors: List[str]
    club_ratings: Dict[str, int | None] = field(init=False, default_factory=dict)


def get_movie_info(slug: str, top_actor_count: int) -> MovieInfo:
    movie_instance = Movie(slug)

    # Only extract the 1st director
    director_list = movie_instance.crew.get("director")
    if director_list is None:
        director = "N/A"
    else:
        director = director_list[0] if len(director_list) > 0 else "N/A"

    cast_list = movie_instance.cast[:top_actor_count]
    actors = []
    for actor in cast_list:
        actors.append(
            ActorInfo(
                slug=actor["slug"],
                name=actor["name"],
                role_name=actor["role_name"],
            )
        )

    return MovieInfo(
        slug=movie_instance.slug,
        poster_url=movie_instance.poster,
        title=movie_instance.title,
        year=movie_instance.year,
        runtime=movie_instance.runtime,
        avg_rating=movie_instance.rating,
        director=director,
        top_actors=actors,
    )


def get_list_slugs(owner: str, slug: str) -> List[str]:
    list_movies = LBoxList(owner, slug).get_movies()
    slugs = []
    for movie_dict in list_movies.values():
        slugs.append(movie_dict["slug"])
    return slugs


def run_list(args: argparse.Namespace):
    # Get CLI args
    list_owner: str = args.owner
    list_slug: str = args.name
    club_users: list[str] = args.users.split(",")
    top_actor_count: int = args.top_actor_count

    # For now, get OUTPUT_DIR from environment, but in the future, just print to stdout
    output_dir = get_env_var("OUTPUT_DIRECTORY", default="")
    if output_dir == "":
        # Fallback to STATE_DIRECTORY
        output_dir = get_env_var("STATE_DIRECTORY")


    slugs = get_list_slugs(list_owner, list_slug)
    logger.info(f"Found {len(slugs)} movie slugs in list")

    movies_info: List[MovieInfo] = []
    for slug in slugs:
        logger.debug(f"Fetching movie info for {slug}")
        movies_info.append(get_movie_info(slug, top_actor_count))
    logger.info("Movie information fetched for all movies")

    logger.info(f"Fetching user ratings for {len(club_users)} users")

    empty_rating_default: Dict[str, int | None] = {
        username: None for username in club_users
    }
    # Key: slug, value: dict(username, optional rating)
    ratings_by_slugs: Dict[str, Dict[str, int | None]] = {}
    for username in club_users:
        logger.debug(f"Fetching movie info for {username}")
        user_ratings = get_user_film_ratings(username)
        for slug, rating in user_ratings:
            if slug not in slugs:
                # Non-list movie
                continue
            ratings_by_slugs.setdefault(
                slug,
                empty_rating_default.copy(),
            ).update({username: rating})

    # Insert club ratings into movie info
    for movie_info in movies_info:
        # If slug key not in dict, then no user has rated the movie
        ratings = ratings_by_slugs.setdefault(
            movie_info.slug, empty_rating_default.copy()
        )
        movie_info.club_ratings = ratings

    output_format = [asdict(m) for m in movies_info]
    output_file = os.path.join(output_dir, "stats.json")
    with open(output_file, "w") as f:
        f.write(json.dumps(output_format))
    logger.info(f"Stats written to {output_file}")


def run_movies(args: argparse.Namespace):
    top_actor_count: int = args.top_actor_count
    slugs: list[str] = args.slugs.split(",")

    logger.info(f"Scraping {len(slugs)} movies")

    movies = []
    for slug in slugs:
        logger.info(f"Scraping {slug}...")
        movies.append(get_movie_info(slug, top_actor_count))

    output_formatted = [asdict(m) for m in movies]
    print(json.dumps(output_formatted))

def get_env_var(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        logger.fatal(f"Environment variable {name} is not defined")
        sys.exit(1)
    return value


def main():
    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument("--loglevel", default=argparse.SUPPRESS, help="Log level, defaults to $LOGLEVEL")

    parser = argparse.ArgumentParser(prog="movie-club-scraper", parents=[common_parser])
    subparsers = parser.add_subparsers(dest="command", required=True)

    # List command
    list_parser = subparsers.add_parser("list", help="Scrape information about a Letterboxd list", parents=[common_parser])
    list_parser.set_defaults(func=run_list)
    list_parser.add_argument("-o", "--owner", help="Username of the list owner", required=True)
    list_parser.add_argument("-n", "--name", "--slug", help="Name/URL slug of the list", required=True)
    list_parser.add_argument("-u", "--users", help="Comma-separated list of users to fetch info about", required=True)
    list_parser.add_argument("--top-actor-count", type=int, help="How many actors to keep while scraping actor list for each movie.", default=4)

    # Movies command
    movies_parser = subparsers.add_parser("movies", help="Scrape detailed information about the provided movies", parents=[common_parser])
    movies_parser.set_defaults(func=run_movies)
    movies_parser.add_argument("--top-actor-count", type=int, help="How many actors to keep while scraping actor list for each movie.", default=4)
    movies_parser.add_argument("slugs", help="Comma-separated list of movie slugs")

    args = parser.parse_args()

    if hasattr(args, "loglevel"):
        loglevel = args.loglevel
    else:
        loglevel = get_env_var("LOGLEVEL", default="INFO")
    logging.basicConfig(level=loglevel)

    args.func(args)


if __name__ == "__main__":
    main()
