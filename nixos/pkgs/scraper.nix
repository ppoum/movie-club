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

  # As long as we're building stuff from source, we'll need to explicitly define the build dependencies
  extraBuildDependencyOverride = final: prev: {
    letterboxdpy = prev.letterboxdpy.overrideAttrs (old: {
      nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [
        final.hatchling
        final.pathspec
        final.pluggy
        final.packaging
        final.trove-classifiers
      ];
    });
    pykit = prev.pykit.overrideAttrs (old: {
      nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [ final.setuptools ];
    });
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
          extraBuildDependencyOverride
        ]
      );
in
(pkgs.callPackage pyproject-nix.build.util { }).mkApplication {
  venv = pythonSet.mkVirtualEnv "scraper-venv" workspace.deps.default;
  package = pythonSet.movie-club-scraper;
}
