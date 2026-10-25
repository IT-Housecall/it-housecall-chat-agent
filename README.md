# @housecall

TODO: Image 

`@housecall` is a self-hosted IT helpdesk agent for Slack, Microsoft Teams and Google Chat. People ask it how to fix
something, and it searches your IT docs (a local folder, Google Drive, Confluence) and answers with links to the
pages it used. It can also act through tools you add (MCP servers or small TypeScript files). Any tool that changes
something waits until the person who asked confirms it in the chat (see [Approvals](#approvals): this is not an IT
sign-off).

This repository is a starter: it holds your settings, runbooks and extensions, and everything else comes from the
[`@ithousecall/chat`](https://www.npmjs.com/package/@ithousecall/chat) npm package. 

```
config/config.yaml        settings 
.env                      secrets (gitignored)
docs/                     your Markdown runbooks
src/main.ts               starts `@housecall` with your extensions
src/extensions/jira.ts    an example extension
deploy/                   Dockerfile, docker-compose.yml, Slack manifest, Teams app
data/                     state (gitignored)
```

## Quickstart

You need Node 24, Docker, an OpenAI/Anthropic/or other AI model API key, and one chat platform set up (see
below). 

```sh
git clone TODO URL
npm install
cp .env.example .env                  # secrets: set OPENAI_API_KEY and the platform's tokens
# edit config/config.yaml: the model, and enable the platform under chat:
cp -r /path/to/your/runbooks/. docs/  # or configure Google Drive or Confluence below
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f
```

The model section takes one of three providers:

```yaml
model: { provider: openai, id: gpt-6.1-sol } # reads OPENAI_API_KEY
# or
model: { provider: anthropic, id: claude-opus-5-5 } # reads ANTHROPIC_API_KEY
# or
model:
  provider: openai_compatible # any /v1/chat/completions endpoint: OpenRouter, vLLM, Ollama...
  base_url: https://openrouter.ai/api/v1
  id: <model id>
  context_window: 200000 # default 128000
  max_tokens: 16384
  api_key_env: LLM_API_KEY
```

## Slack

To set up Slack:

1. Create an app at https://api.slack.com/apps from a manifest and paste [`deploy/slack-manifest.yml`](deploy/slack-manifest.yml).
   It sets the bot scopes (`app_mentions:read`, `chat:write`, `channels:history`, `groups:history`, `im:history`,
   `files:read` for screenshots), the events (`app_mention`, `message.im`), interactivity and Socket Mode.
2. Under Basic Information, create an app-level token with the `connections:write` scope. That is `SLACK_APP_TOKEN`
   (`xapp-...`).
3. Install the app to your workspace and copy the Bot User OAuth Token into `SLACK_BOT_TOKEN` (`xoxb-...`).
4. Set `chat.slack.enabled: true`.

Note: Slack does not need a public URL, unlike Teams, so you don't need to set up a Cloudflare tunnel.

## Microsoft Teams

Teams posts to `@housecall` over HTTPS, so it needs a public HTTPS URL. We recommend using `cloudflared tunnel`. Though, you can also host this on a container as a service platform, like Google Cloud Run, and get a public URL that way.

```sh
cloudflared tunnel --url http://localhost:3978
```

1. In the Azure portal create an Azure Bot, single tenant, with a new app registration. Set the messaging endpoint to
   `https://<public host>/api/messages` and add the Microsoft Teams channel.
2. Put the app registration's client ID, a client secret and your tenant ID in `TEAMS_CLIENT_ID`,
   `TEAMS_CLIENT_SECRET` and `TEAMS_TENANT_ID`.
3. Edit [`deploy/teams-app/manifest.json`](deploy/teams-app/manifest.json): set `id` and `bots[0].botId` to the client ID and fill in
   `developer`. Zip `manifest.json`, `color.png` and `outline.png` (files at the zip root) and upload it in Teams
   (Apps, Manage your apps, Upload an app) or through the Teams admin center.
4. Set `chat.teams.enabled: true`.

## Google Chat

Google Chat posts to `@housecall` over HTTPS and needs a public HTTPS URL. We recommend using `cloudflared tunnel`. Though, you can also host this on a container as a service platform, like Google Cloud Run, and get a public URL that way.

```sh
cloudflared tunnel --url http://localhost:3978
```

1. In a Google Cloud project, enable the Google Chat API and create a service account with a JSON key. Mount the key
   into the container (put it in `secrets/` and uncomment `../secrets:/app/secrets:ro` in
   `deploy/docker-compose.yml`) and set `GOOGLE_SERVICE_ACCOUNT_FILE=secrets/<file>.json`.
2. In the Chat API's Configuration page, set the connection to HTTP endpoint URL, for example
   `https://<public host>/googlechat`, and set the authentication audience to **Project Number**. Choose who can use
   the app.
3. Set the same URL and the project's number (on the Cloud console dashboard) in config:

   ```yaml
   chat:
     googlechat:
       enabled: true
       endpoint_url: https://<public host>/googlechat
       project_number: "123456789012"
   ```

4. Add the app to a space or open a DM with it.

`@housecall` serves the path of `endpoint_url` and accepts only requests signed for this project: tokens from Chat
(`chat@system.gserviceaccount.com`) for the project number, or, for a Chat app built as a Google Workspace add-on, ID
tokens for `endpoint_url` from the project's own add-on service agent
(`service-<project_number>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`). The "HTTP endpoint URL" audience is not
accepted for Chat API apps, because any Chat app could be pointed at your URL with it.

## Adding your runbooks/docs 

TODO: Image of an agent referencing docs

TODO: what is this

Sources are indexed at startup and every `sync_interval_minutes`.
Only changed documents are fetched again, documents that are deleted from the source (e.g., Google Drive) are removed, and the documents of a source you remove from the config are dropped at the next sync. Each source needs a unique `name`.

Security note: Anyone who can message `@housecall` can read, through it, any document its docs credentials can see within the
configured scope. Use a low-privilege account for Drive and Confluence, and scope it to what everyone may read.

```yaml
docs:
  sync_interval_minutes: 30
  sources:
    - type: local
      name: runbooks
      path: ./docs
      url_base: https://github.com/acme/it-docs/blob/main/docs
    - type: google_drive
      name: it-drive
      folder_id: 1AbCdEfGhIjKlMnOpQrStUvWxYz
    - type: confluence
      name: wiki
      site: https://acme.atlassian.net
      space_key: IT
      parent_page_id: "123456"
```

- **local**: every `.md`, `.markdown` and `.txt` file under `path`, recursively (relative to the project folder). Answers
  link to `url_base` plus the file's relative path, or to a `file://` path if `url_base` is unset. In Docker, put
  the files in `docs/`, which is mounted at `/app/docs`.
- **google_drive**: the folder `folder_id` (the last part of the folder's URL) and all its subfolders. Share the
  folder with the service account's email as Viewer; that sharing is the scope, since the account sees nothing else.
  Google Docs, Markdown and plain text files are indexed; other file types are skipped. Uses
  `GOOGLE_SERVICE_ACCOUNT_FILE`.
- **confluence** (Cloud): set `space_key` for a whole space, `parent_page_id` for one page and everything below it,
  or both. The page ID is the number in the page URL. Uses `CONFLUENCE_EMAIL` and `CONFLUENCE_API_TOKEN` (create a
  token at https://id.atlassian.com/manage-profile/security/api-tokens); the account only needs read access to that
  space.

## Extensions

TODO: Image of an example extension

You can extend the functionality of `@housecall` by writing extensions. 

Some things you can do with extensions:
- TODO ADD THESE

### Approvals

A tool marked as a write tool does not run until the requester confirms it: the person whose message led the model
to call it. @housecall posts an approval message with the tool, its arguments and Approve/Deny buttons (`approve <id>` /
`deny <id>` in the console). Only the requester's click counts; anyone else who clicks is told so. An undecided
approval expires after `approvals.timeout_minutes` (default 60) and the model is told the action did not happen. A
pending approval survives a restart; a crash in the moment between posting it and recording that it was posted can
post it a second time. While it is pending, new messages in that thread are added to the same turn, and a tool the
model calls after reading someone else's message asks that person.

Approval is the requester confirming the action, not an IT sign-off: anyone can confirm what they asked for. So a
write tool must act only on the requester's own account, or check for itself that the requester may do what it does.
Code extensions get the requester with `requester(api, context)` from `@ithousecall/chat` (a chat user ID and
display name). Do not give everyone admin tools such as resetting someone else's MFA; for MCP servers, list the
tools that are safe for everyone in `read_only` and leave admin servers out.

### MCP servers

```yaml
mcp:
  - name: tickets
    command: npx
    args: ["-y", "@acme/tickets-mcp"]
    env: { TICKETS_TOKEN: "${TICKETS_TOKEN}" }
    read_only: [search_tickets, get_ticket]
  - name: remote
    url: https://mcp.example.com/mcp
    headers: { Authorization: "Bearer ${REMOTE_MCP_TOKEN}" }
```

Each server's tools appear to the model as `mcp__<name>__<tool>`; a tool whose name collides with another after
that renaming is skipped and logged. Server names may not contain `__`. Every tool needs approval unless it is listed in `read_only`; the server's own
`readOnlyHint` is ignored. Stdio servers get only `PATH`, `HOME`, `USER`, `LANG`,
`TMPDIR` and their own `env`, not @housecall's secrets. The Docker image is Debian-based, so `npx` servers work in it.

### Code extensions

An extension is a TypeScript file in `src/extensions/` that `src/main.ts` passes to `start()`. Add it to the
`extensions` list there:

```ts
import { start } from "@ithousecall/chat";
import jira from "./extensions/jira.ts";
import laptops from "./extensions/laptops.ts";

await start({ config: "config/config.yaml", data: "data", extensions: [jira, laptops] });
```

A minimal one, `src/extensions/laptops.ts`:

```ts
import { defineExtension, defineTool, Type } from "@ithousecall/chat";

export default defineExtension({
  name: "laptops",
  tools: [
    defineTool({
      name: "request_loaner",
      description: "Request a loaner laptop for the user.",
      parameters: Type.Object({ reason: Type.String() }),
      write: true, // ask the user first
      summary: (args) => `Request a loaner laptop: "${args.reason}"`,
      execute: async (args) => ({ output: [{ type: "text", text: `Requested (${args.reason}).` }] }),
    }),
  ],
});
```

Node runs the file as TypeScript directly, so use only erasable syntax (no `enum` or parameter properties). Add any
npm packages it needs to `package.json`; `npm run check` type checks `src/`.
[`src/extensions/jira.ts`](src/extensions/jira.ts) adds `jira_search` and an approval-gated `jira_create_issue` that
notes the requester in the issue; its tools are added only when `JIRA_BASE_URL`, `JIRA_EMAIL` and `JIRA_API_TOKEN` are
set. Remove it from `src/main.ts` if you don't use Jira.

## Updating

- `npm install @ithousecall/chat@latest`
- commit `package.json` and `package-lock.json`
- rebuild the image
