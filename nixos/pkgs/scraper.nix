{
  pkgs,
  pyproject-nix,
  uv2nix,
  pyproject-build-systems,
}:
let
  scraperSrcDir = ../../scraper;
  # uv workspace
  workspace = uv2nix.lib.workspace.loadWorkspace {
    workspaceRoot = scraperSrcDir;
  };

  pyWorkspaceOverlay = workspace.mkPyprojectOverlay {
    sourcePreference = "wheel";
  };

  # Obtain python version from pyproject.toml
  python = pkgs.lib.head (
    pyproject-nix.lib.util.filterPythonInterpreters {
      inherit (workspace) requires-python;
      inherit (pkgs) pythonInterpreters;
    }
  );

  pythonSet =
    (pkgs.callPackage pyproject-nix.build.packages {
      inherit python;
    }).overrideScope
      (
        pkgs.lib.composeManyExtensions [
          pyproject-build-systems.overlays.wheel
          pyWorkspaceOverlay
        ]
      );
in
(pkgs.callPackage pyproject-nix.build.util { }).mkApplication {
  venv = pythonSet.mkVirtualEnv "scraper-venv" workspace.deps.default;
  package = pythonSet.movie-club-scraper;
}
