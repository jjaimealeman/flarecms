# Flare CMS

Edge-first headless CMS built for Cloudflare Workers.

Forked from [SonicJS](https://github.com/Sonicjs-Org/sonicjs) with security hardening, content workflows, media pipeline improvements, and rebranding.

## Monorepo Structure

```
packages/
  core/   — @flare-cms/core (engine, admin UI, API)
  cms/    — CMS backend (Cloudflare Worker)
  site/   — Astro frontend (Cloudflare Pages)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build core
pnpm build

# Start CMS (in separate terminal)
cd packages/cms && wrangler dev

# Start site (in separate terminal)
cd packages/site && pnpm dev
```

## Deploy

```bash
pnpm deploy:cms   # Deploy CMS Worker
pnpm deploy:site  # Build + deploy Astro site
```

## Credits

Built on [SonicJS](https://sonicjs.com) by the SonicJS Team. Licensed under MIT.

## License

[MIT](LICENSE)
