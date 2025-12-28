{
  pkgs,
  pyproject-nix,
  uv2nix,
  pyproject-build-systems,
}:
{
  scraper = pkgs.callPackage ./scraper.nix {
    inherit pyproject-build-systems;
    inherit pyproject-nix;
    inherit uv2nix;
  };
}
