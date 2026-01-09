{
  pkgs,
  pyproject-nix,
  uv2nix,
  pyproject-build-systems,
}:
{
  movie-club-scraper = pkgs.callPackage ./scraper.nix {
    inherit
      pyproject-build-systems
      pyproject-nix
      uv2nix
      ;
  };

  movie-club-webapp = pkgs.callPackage ./webapp.nix { };
}
