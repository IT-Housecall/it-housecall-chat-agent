// Creates the Slack app from slack-manifest.yml and sets its icon. Needs SLACK_CONFIG_TOKEN, an App Configuration
// Token from https://api.slack.com/apps. Run from the repo root: node --env-file=.env deploy/slack-app.mjs
import { readFileSync } from "node:fs";
import { parse } from "yaml";

async function call(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SLACK_CONFIG_TOKEN}` },
    body,
  });
  return res.json();
}

const manifest = JSON.stringify(parse(readFileSync("deploy/slack-manifest.yml", "utf8")));
const app = await call("apps.manifest.create", new URLSearchParams({ manifest }));
if (!app.ok) throw new Error(`apps.manifest.create: ${app.error} ${JSON.stringify(app.errors ?? [])}`);

const form = new FormData();
form.set("app_id", app.app_id);
form.set("file", new Blob([readFileSync("deploy/icon.png")], { type: "image/png" }), "icon.png");
const icon = await call("apps.icon.set", form);
console.log(`app_id: ${app.app_id}`);
console.log(icon.ok ? "icon: set" : `icon: not set (${icon.error})`);
