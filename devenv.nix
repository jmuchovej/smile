{
  pkgs,
  config,
  ...
}:
{
  env = {
    PROJECT_ROOT = config.devenv.root;
    PROJECT_CONFIG_PATH = "${config.env.PROJECT_ROOT}/.config";
    TREEFMT_CONFIG = "${config.env.PROJECT_CONFIG_PATH}/treefmt.toml";
  };

  packages = with pkgs; [
    git
    just
    ripgrep
    jujutsu
    llm-agents.claude-code
    llm-agents.openspec
    tombi
    oxfmt
    statix
    zizmor
    typos
    keep-sorted
    nixfmt-rs
    deadnix
  ];

  enterShell = ''
    export PATH="${config.env.PROJECT_ROOT}/bin:$PATH";
  '';

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

  git-hooks.enable = true;
  git-hooks.hooks = {
    treefmt.enable = true;
    # lychee.enable = true;
    pre-commit-hook-ensure-sops.enable = true;
    check-symlinks.enable = true;
    end-of-file-fixer.enable = true;
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

  env.TREEFMT_ALLOW_MISSING_FORMATTER = true;
  env.TREEFMT_VERBOSE = 1; # 0 = warn, 1 = info, 2 = debug
  treefmt.enable = true;
  treefmt.config.settings = pkgs.lib.importTOML config.env.TREEFMT_CONFIG;
}
