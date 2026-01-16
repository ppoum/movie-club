{ pkgs }:
let
  nodejs = pkgs.nodejs_24;
  rustPlatform = pkgs.makeRustPlatform {
    cargo = pkgs.rust-bin.stable."1.92.0".default;
    rustc = pkgs.rust-bin.stable."1.92.0".default;
  };

  frontendSrc = ../../frontend;
  backendSrc = ../../backend;

  node-frontend = pkgs.buildNpmPackage (finalAttrs: {
    inherit nodejs;
    pname = "movie-club-frontend";
    version = "0.1.0";
    src = frontendSrc;

    npmDepsHash = "sha256-r81wRtiexPET6IE73oQoUK+wDcPOdrFFajH6WXal1KM=";

    installPhase = ''
      cp -r dist $out/
    '';
  });
in
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "movie-club-backend";
  version = "0.1.0";
  src = backendSrc;

  # Environment variable
  FRONTEND_DIST_DIR = node-frontend;

  buildInputs = [ node-frontend ];

  cargoHash = "sha256-HDa0RlCeVGU20crpoKJuzdpSAsKb40KBI8Qe9M0ZaOU=";

  postInstall = ''
    # Rename binary
    mv $out/bin/backend $out/bin/movie-club-webapp
  '';

  meta.mainProgram = "movie-club-webapp";
})
