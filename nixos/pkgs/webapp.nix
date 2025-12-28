{ pkgs }:
let
  nodejs = pkgs.nodejs_24;
  src = ../../frontend;
in
pkgs.buildNpmPackage (finalAttrs: {
  inherit nodejs;
  inherit src;
  pname = "movie-club-webapp";
  version = "0.1.0";

  npmDepsHash = "sha256-S92RrxcRL8vf4eJ0U0Rl+V7lDLOUMrQ2CMbSsxFaSj0=";

  installPhase = ''
    mkdir -p $out/{bin,lib}
    cp -r dist dist-backend $out/lib
    cat >$out/bin/movie-club-webapp <<EOF
    #!${pkgs.runtimeShell}
    export NODE_ENV=production
    export DIST_DIR=$out/lib/dist/
    exec ${nodejs}/bin/node $out/lib/dist-backend/index.js
    EOF
    chmod +x $out/bin/movie-club-webapp
  '';
  meta.mainProgram = "movie-club-webapp";
})
