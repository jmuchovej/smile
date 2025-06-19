{
  pkgs,
  config,
  lib,
  ...
}:
{
  env.PROJECT_ROOT = config.git.root;

  packages = with pkgs; [
    git
    just
    ripgrep
    jujutsu
    llm-agents.claude-code
    llm-agents.openspec
  ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    lsp.enable = true;
    pnpm.enable = true;
  };
  languages.typescript = {
    enable = true;
    lsp.enable = true;
  };

  git-hooks = {
    enable = true;
    hooks = {
      treefmt.enable = true;
      # lychee.enable = true;
      zizmor.enable = true;
      deadnix.enable = true;
      pre-commit-hook-ensure-sops.enable = true;
      check-symlinks.enable = true;
      end-of-file-fixer.enable = true;
      keep-sorted.enable = true;
      trim-trailing-whitespace.enable = true;
      check-vcs-permalinks.enable = true;
      check-shebang-scripts-are-executable.enable = true;
      check-executables-have-shebangs.enable = true;
      check-added-large-files.enable = true;
      check-added-large-files.args = [
        "--maxkb"
        "1024"
      ];
      check-case-conflicts.enable = true;
    };
  };

  tasks."devenv:treefmt:run".before = lib.mkForce [ ];
  tasks."devenv:treefmt:run".exec = lib.mkForce "";

  env.TREEFMT_ALLOW_MISSING_FORMATTER = true;
  env.TREEFMT_VERBOSE = 1; # 0 = warn, 1 = info, 2 = debug
  treefmt = {
    enable = true;
    config = {
      settings.global = {
        on-unmatched = "info";
        excludes = [
          "*.{pdf,gif,ico,png}"
          "*.jsonl"
          ".gitignore"
          ".devenv/**"
          ".direnv/**"
        ];
      };
      programs = {
        statix = {
          enable = true;
          excludes = [ "repeated_keys" ];
        };
        just.enable = true;
        oxfmt = {
          enable = true;
          # since oxfmt doesn't support MDC (it completely breaks components)
          excludes = [ "*.{md,mdx}" ];
        };
      };
    };
  };
}
