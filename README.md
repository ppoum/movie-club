# Movie Club

Website project to display stats from a movie club list of movies.

## Setup

This project parses the movies from a provided Letterboxd movie list and list
of Letterboxd users to generate an HTML page displaying stats.

### Scraper

The scraper is configured via environment variables:

- `LIST_OWNER`: Letterboxd list owner
- `LIST_SLUG`: Letterboxd list url slug
  - For example, in `https://letterboxd.com/dave/list/official-top-250`, the
    `LIST_OWNER` is `dave` and the `LIST_SLUG` is `official-top-250`.
- `CLUB_USERS`: List of Letterboxd users to consider in the club (comma-separated)
- `OUTPUT_PATH`: Output path for the result file
