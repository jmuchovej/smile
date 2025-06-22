set shell := ["sh", "-cu"]

# List available recipes
default:
    @just --list

[private]
via-nuxt *ARGS:
    pnpm exec nuxt {{ ARGS }}

# Start the Nuxt development server
dev:
    @just via-nuxt dev

# Generate Nuxt type stubs (.nuxt/)
prepare:
    @just via-nuxt prepare

setup: prepare
    pnpm install

# Production build of the Nuxt app (NUXT_UI_PRO_LICENSE must be in the environment)
build:
    @just via-nuxt build

# Static build of the Nuxt app (NUXT_UI_PRO_LICENSE must be in the environment)
generate:
    @just via-nuxt generate

# Run the unit test suite once
test:
    pnpm vitest run
    pnpm vitest run --config tests/nuxt/vitest.config.ts

# Type-check the Nuxt app with vue-tsc
typecheck: prepare
    @just via-nuxt typecheck

# Format the tree with treefmt
fmt:
    treefmt
