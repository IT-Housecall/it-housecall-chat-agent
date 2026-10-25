# @housecall starter

A self-hosted IT helpdesk chat agent for Slack, Microsoft Teams and Google Chat that answers from the organization's IT
docs. This repo holds the settings, runbooks and extensions; the engine is the `@ithousecall/chat` npm package.

```
config/config.yaml   settings (no secrets; committed)
.env                 secrets (gitignored; copied from .env.example)
secrets/             service account keys (gitignored)
docs/                runbooks indexed by the local docs source
how-to/              setup guide for coding agents (not indexed)
src/main.ts          entry point; src/extensions/ holds code extensions
deploy/              Dockerfile, docker-compose.yml, Slack manifest, Teams app
data/                state (gitignored)
```

To set this repo up, read and follow `how-to/SETUP.md`.

## Working notes

- `npm run console` runs it in the terminal with no chat platform. Piped input
  works: `echo "How do I connect to the VPN?" | npm run console`.
- `npm run check` type checks `src/`. Run it after changing extensions.
- Run it with `docker compose -f deploy/docker-compose.yml up -d --build`; read logs with
  `docker compose -f deploy/docker-compose.yml logs`.
- Settings reference: the comments in `config/config.yaml`, and `README.md`.
- Update: `npm install @ithousecall/chat@latest`, commit `package.json` and `package-lock.json`, rebuild the image.
- Never print or commit the contents of `.env` or `secrets/`.
