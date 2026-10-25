# Setting up @housecall

Instructions for you, the coding agent. Walk the user through setup and do the work yourself: edit
`config/config.yaml` and `.env`, run commands, and read logs. Ask the user only for decisions and for the steps that
need their browser. Ask one step at a time, and confirm each part works before moving on. Never print, log or commit
secrets.

When the user has a browser step, write out the numbered steps from this guide in your message, each with its link
and one action per bullet, then wait for them to finish. Never refer to steps you haven't shown them.

Keep messages short. Don't compare options or explain trade-offs, and don't mention settings that are already right;
once they choose, give only what their choice needs.

## 1. Organization, model and chat platform

Ask exactly this, as plain text, and nothing more:

> 1. What is your organization called?
> 2. Which model provider do you use? OpenAI, Anthropic, or another OpenAI-compatible endpoint (OpenRouter, vLLM,
>    Ollama, etc.)
> 3. Which chat platform will the bot run in? Slack, Microsoft Teams or Google Chat

Ask follow-ups, such as a base URL and model ID for another endpoint, only after they answer.

- Set the top-level `org:` in `config/config.yaml`; add the line at the top if it is missing.
- Set the `model:` block (examples are in the file's comments and `README.md`). Run `cp .env.example .env` if
  `.env` doesn't exist, then ask them to create a key and paste it into `.env` themselves (`OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, or the variable named by `api_key_env`), or offer to write it if they give it to you. Link
  where to create it: https://platform.openai.com/api-keys (OpenAI), https://console.anthropic.com/settings/keys
  (Anthropic), https://openrouter.ai/settings/keys (OpenRouter).

## 2. Prepare

- Check Node 24 (`node -v`) and Docker with Compose (`docker compose version`). Docker is needed from step 4.
- Run `npm install`.

## 3. Chat platform

Set `enabled: true` for their platform under `chat:` and `false` for the others. If it gets stuck, they can keep
using `npm run console` and add the platform later.

**Slack** (no public URL needed). The user, in a browser:

1. Get a configuration token at https://api.slack.com/apps:
   - Under **Your App Configuration Tokens**, click **Generate Token** and pick your workspace.
   - Copy the **Access Token** and paste it into `.env` as `SLACK_CONFIG_TOKEN=...`.

You: run `node --env-file=.env deploy/slack-app.mjs`. It creates the app from `deploy/slack-manifest.yml`, sets its
icon and prints the app ID. Then delete the `SLACK_CONFIG_TOKEN` line from `.env`. The app is named housecall; don't
offer to rename it.

The user, with the app ID in the links:

2. Create the app-level token at `https://api.slack.com/apps/<app ID>/general`:
   - Scroll to **App-Level Tokens** and click **Generate Token and Scopes**.
   - Name it anything, add the `connections:write` scope, and click **Generate**.
   - Copy the `xapp-` token.
3. Install the app at `https://api.slack.com/apps/<app ID>/install-on-team`:
   - Click **Install to Workspace**, then **Allow**.
   - Copy the **Bot User OAuth Token** (`xoxb-`).

You: set `SLACK_APP_TOKEN` and `SLACK_BOT_TOKEN` in `.env`, or have them paste them in.

If the script fails, have them create the app by hand instead: at https://api.slack.com/apps, **Create New App**,
**From a manifest**, pick the workspace, and paste `deploy/slack-manifest.yml` (show it to them) on the **YAML** tab.
Then in **Basic Information**, **Display Information**, upload `deploy/icon.png` as the **App icon**. Continue with
steps 2 and 3 from the app's page.

**Microsoft Teams** and **Google Chat** need a public HTTPS URL to port 3978. Run
`cloudflared tunnel --url http://localhost:3978` in the background (install `cloudflared` if missing) and note the
`https://....trycloudflare.com` URL. It changes on every run; for anything long-lived they need a named tunnel or a
host with its own URL.

**Microsoft Teams**. The user, in the Azure portal:

1. Create the bot at https://portal.azure.com/#create/Microsoft.AzureBot:
   - Name it housecall and pick a subscription and resource group.
   - Under **Microsoft App ID**, choose **Single Tenant** and **Create new Microsoft App ID**.
   - Click **Review + create**, then **Create**.
2. Connect it:
   - In the bot's **Configuration**, set **Messaging endpoint** to `<public URL>/api/messages` and click **Apply**.
   - Click **Manage Password**, then **New client secret**, and copy its value.
   - In **Channels**, add **Microsoft Teams**.
3. Send you the app ID, the tenant ID (both on **Configuration**) and the secret, or paste them into `.env`.

You: set `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET` and `TEAMS_TENANT_ID`. In `deploy/teams-app/manifest.json`, set
`id` and `bots[0].botId` to the client ID and fill in `developer` with the organization's name and URLs. Zip it with
the files at the zip root (`deploy/*.zip` is gitignored):
`cd deploy/teams-app && zip ../housecall-teams.zip manifest.json color.png outline.png`. The user uploads it in Teams
(Apps, Manage your apps, Upload an app) or in the Teams admin center.

**Google Chat**. The user, in Google Cloud:

1. Create the credentials:
   - Enable the Google Chat API at https://console.cloud.google.com/apis/library/chat.googleapis.com.
   - At https://console.cloud.google.com/iam-admin/serviceaccounts, create a service account.
   - Open it, then **Keys**, **Add key**, **JSON**, and save the file.
2. Configure the app at https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat:
   - Set the name to housecall, the avatar URL to `https://chat.ithousecall.app/icon.png`, and a description.
   - Turn on **Interactive features** and **Join spaces and group conversations**.
   - Under **Connection settings**, choose **HTTP endpoint URL** and enter `<public URL>/googlechat`.
   - Set **Authentication audience** to **Project Number**.
   - Under **Visibility**, choose who can use it, then click **Save**.
3. Send you the project number (on the project's dashboard) and the key file's path.

You: put the key in `secrets/`, set `GOOGLE_SERVICE_ACCOUNT_FILE=secrets/<file>.json`, uncomment the secrets volume
in `deploy/docker-compose.yml`, and set `chat.googlechat.endpoint_url` and `project_number` (quoted).

## 4. Try it in chat

```sh
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs --tail 100
```

Read the logs for config, auth or connection errors and fix them. Then ask the user to message the bot, in a DM or by
mentioning it in a channel (Slack: `/invite @housecall` first), and watch the logs while they do. It has no docs yet,
so any question will do. Fix errors before going on.

If they skipped the chat platform, run `echo "Hello" | npm run console` instead.

## 5. Docs

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

## 6. Try it with their docs

Run `docker compose -f deploy/docker-compose.yml up -d --build --force-recreate` to pick up the changes, then ask the
user to message the bot a question their docs answer, and watch the logs. Indexing runs in the background; if the
answer finds nothing, ask again. Without a chat platform, use `echo "<question>" | npm run console`.

## 7. Finish

Remind them to commit `config/config.yaml`, `package-lock.json`, `docs/` and any `deploy/` changes, and never `.env`
or `secrets/`. Summarize what is set up and what is left, such as replacing a quick tunnel with a permanent URL.
