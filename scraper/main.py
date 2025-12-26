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


def main(
    list_owner: str,
    list_slug: str,
    club_users: List[str],
    top_actor_count: int,
    output_path: str,
):
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
        ratings = ratings_by_slugs[movie_info.slug]
        movie_info.club_ratings = ratings

    output_format = [asdict(m) for m in movies_info]
    with open(output_path, "w") as f:
        f.write(json.dumps(output_format))


def get_env_var(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        logger.fatal(f"{name} is not defined")
        sys.exit(1)
    return value


if __name__ == "__main__":
    log_level = get_env_var("LOGLEVEL", default="INFO")
    logging.basicConfig(level=log_level)

    list_owner = get_env_var("LIST_OWNER")
    list_slug = get_env_var("LIST_SLUG")
    club_users = get_env_var("CLUB_USERS").split(",")
    output_path = get_env_var("OUTPUT_PATH")

    try:
        top_actor_count = int(get_env_var("TOP_ACTOR_COUNT", default="4"))
    except ValueError:
        logger.fatal("Invalid TOP_ACTOR_COUNT value")
        sys.exit(1)

    main(list_owner, list_slug, club_users, top_actor_count, output_path)
