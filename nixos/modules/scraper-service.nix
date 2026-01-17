flake:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.movie-club.scraper;
in
{
  options.services.movie-club.scraper = {
    enable = lib.mkEnableOption "movie club scraper service";

    package = lib.mkOption {
      type = lib.types.package;
      default = flake.packages.${pkgs.system}.movie-club-scraper;
      description = "Movie club scraper package to run";
    };

    interval = lib.mkOption {
      default = "5min";
      type = lib.types.str;
      description = "How often to refresh the movie club stats.";
    };

    # Environment variables
    list_owner = lib.mkOption {
      type = lib.types.str;
    };

    list_slug = lib.mkOption {
      type = lib.types.str;
    };

    club_users = lib.mkOption {
      type = lib.types.listOf lib.types.str;
    };

    top_actor_count = lib.mkOption {
      type = lib.types.int;
      default = 4;
    };

    output_dir = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
    };

    loglevel = lib.mkOption {
      type = lib.types.str;
      default = "INFO";
    };

  };

  config = lib.mkIf cfg.enable {
    # Create user
    users.users.movie-club-scraper = {
      isSystemUser = true;
      description = "Movie club scraper service user";
      group = "movie-club";
      createHome = false;
    };
    users.groups.movie-club = { };

    # Create output directory

    systemd.services.movie-club-scraper = {
      description = "Movie club statistics scraper";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];
      serviceConfig = {
        User = "movie-club-scraper";
        Group = "movie-club";
        Type = "oneshot";
        StateDirectory = "movie-club";
        ExecStart = ''
          ${lib.getExe cfg.package} list \
            --loglevel "${config.services.movie-club.scraper.loglevel}" \
            --owner "${config.services.movie-club.scraper.list_owner}" \
            --name "${config.services.movie-club.scraper.list_slug}" \
            --users "${lib.strings.concatStringsSep "," config.services.movie-club.scraper.club_users}" \
            --top-actor-count "${builtins.toString config.services.movie-club.scraper.top_actor_count}"'';
      };
      environment =
        # Only define envvar if option is set
        if config.services.movie-club.scraper.output_dir != null then
          {
            OUTPUT_DIRECTORY = config.services.movie-club.scraper.output_dir;
          }
        else
          { };
    };

    systemd.timers.movie-club-scraper = {
      description = "Movie club statistics scraper timer";
      wantedBy = [ "timers.target" ];

      timerConfig = {
        OnBootSec = cfg.interval;
        OnUnitInactiveSec = cfg.interval;
      };
    };

  };
}
