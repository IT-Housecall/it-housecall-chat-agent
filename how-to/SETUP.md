# Setting up @housecall

Instructions for you, the coding agent. Walk the user through setup and do the work yourself: edit
`config/config.yaml` and `.env`, run commands, and read logs. Ask the user only for decisions and for the steps that
need their browser. Ask one step at a time, and confirm each part works before moving on. Never print, log or commit
secrets.

When the user has a browser step, write out the numbered steps from this guide in your message, each with its link,
then wait for them to finish. Never refer to steps you haven't shown them.

## 1. Organization and model

Ask both at once: what the organization is called (an open question; don't offer the placeholder in the config as
an answer), and which model provider they use (OpenAI, Anthropic, or another OpenAI-compatible endpoint such as
OpenRouter, vLLM or Ollama).

- Set the top-level `org:` in `config/config.yaml`; add the line at the top if it is missing.
- Set the `model:` block (examples are in the file's comments and `README.md`). Run `cp .env.example .env` if
  `.env` doesn't exist, then ask them to create a key and paste it into `.env` themselves (`OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, or the variable named by `api_key_env`), or offer to write it if they give it to you. Link
  where to create it: https://platform.openai.com/api-keys (OpenAI), https://console.anthropic.com/settings/keys
  (Anthropic), https://openrouter.ai/settings/keys (OpenRouter).

## 2. Chat platform

Ask which they use: Slack, Microsoft Teams or Google Chat. Set `enabled: true` for it under `chat:` and `false` for
the others. If it gets stuck, they can keep using `npm run console` and add the platform later.

**Slack** (no public URL needed). The user, in a browser:

1. At https://api.slack.com/apps: Create New App, From a manifest, pick the workspace and paste
   `deploy/slack-manifest.yml` (offer to rename the app in it first).
2. Basic Information, App-Level Tokens, Generate Token and Scopes with `connections:write`: the `xapp-` token.
3. Install App, Install to Workspace, copy the Bot User OAuth Token: the `xoxb-` token.

You: set `SLACK_APP_TOKEN` and `SLACK_BOT_TOKEN` in `.env`, or have them paste them in.

**Microsoft Teams** and **Google Chat** need a public HTTPS URL to port 3978. Run
`cloudflared tunnel --url http://localhost:3978` in the background (install `cloudflared` if missing) and note the
`https://....trycloudflare.com` URL. It changes on every run; for anything long-lived they need a named tunnel or a
host with its own URL.

**Microsoft Teams**. The user, in the Azure portal:

1. At https://portal.azure.com/#create/Microsoft.AzureBot: create an Azure Bot, Single Tenant, Create new Microsoft
   App ID.
2. Configuration: set the messaging endpoint to `<public URL>/api/messages`. Manage Password: create a client secret.
3. Channels: add Microsoft Teams.
4. Give you the app ID, the secret and the tenant ID (or paste them into `.env`).

You: set `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET` and `TEAMS_TENANT_ID`. In `deploy/teams-app/manifest.json`, set
`id` and `bots[0].botId` to the client ID and fill in `developer` with the organization's name and URLs. Zip it with
the files at the zip root (`deploy/*.zip` is gitignored):
`cd deploy/teams-app && zip ../housecall-teams.zip manifest.json color.png outline.png`. The user uploads it in Teams
(Apps, Manage your apps, Upload an app) or in the Teams admin center.

**Google Chat**. The user, in Google Cloud:

1. Enable the Google Chat API at https://console.cloud.google.com/apis/library/chat.googleapis.com. At
   https://console.cloud.google.com/iam-admin/serviceaccounts create a service account, then Keys, Add key, JSON.
2. At https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat (the Chat API's Configuration): set the name, avatar and description; turn on interactive features and Join
   spaces and group conversations; under Connection settings choose HTTP endpoint URL `<public URL>/googlechat` and
   Authentication audience **Project Number**; under Visibility choose who can use it.
3. Give you the project number (on the project's dashboard).

You: put the key in `secrets/`, set `GOOGLE_SERVICE_ACCOUNT_FILE=secrets/<file>.json`, uncomment the secrets volume
in `deploy/docker-compose.yml`, and set `chat.googlechat.endpoint_url` and `project_number` (quoted).

## 3. Prepare

- Check Node 24 (`node -v`) and Docker with Compose (`docker compose version`). Docker is needed only for step 6.
- Run `npm install`.

## 4. Docs

Ask where their IT docs live and configure `docs.sources` in `config/config.yaml`. Remove sources they don't use.

- **Local folder** of Markdown or text files: copy them into `docs/`. If they are in a git repo, ask for its web URL
  and set `url_base` so answers link to it.
- **Google Drive**. The user, in a browser: enable the Google Drive API at
  https://console.cloud.google.com/apis/library/drive.googleapis.com; at
  https://console.cloud.google.com/iam-admin/serviceaccounts create a service account and download a JSON key (or
  reuse the Google Chat one); share the Drive folder with the service account's
  email as Viewer; give you the folder URL. You: put the key in `secrets/`, set
  `GOOGLE_SERVICE_ACCOUNT_FILE=secrets/<file>.json`, uncomment the `../secrets:/app/secrets:ro` volume in
  `deploy/docker-compose.yml`, and add a `google_drive` source with the folder ID (the last part of the URL).
- **Confluence** (Cloud only). The user, in a browser: create an API token at
  https://id.atlassian.com/manage-profile/security/api-tokens for an account that can read only what everyone may
  read; give you the site URL and the space key or the parent page URL. You: set `CONFLUENCE_EMAIL` and
  `CONFLUENCE_API_TOKEN` (or have them paste these into `.env`), and add a `confluence` source with `site` and
  `space_key` and/or `parent_page_id` (quoted; the number in the page URL).

Tell them that anyone who can message the bot can read, through it, every document its docs credentials can see.

If Drive or Confluence gets stuck, suggest testing with a copy first: they download or export a few docs as Markdown
or text into `docs/`, and you use the local source. They can switch later.

## 5. Try it in the terminal

Ask a question their docs answer:
`echo "How do I connect to the VPN?" | npm run console`. The console ignores `chat:`, so this checks the model and the
docs. Indexing runs in the background; if the answer finds nothing, ask again. Fix errors before going on.

## 6. Run it

```sh
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs --tail 100
```

Read the logs for config, auth or connection errors and fix them. Then ask the user to message the bot, in a DM or by
mentioning it in a channel (Slack: `/invite @housecall` first), and watch the logs while they do.

## 7. Finish

Remind them to commit `config/config.yaml`, `package-lock.json`, `docs/` and any `deploy/` changes, and never `.env`
or `secrets/`. Summarize what is set up and what is left, such as replacing a quick tunnel with a permanent URL.
