import { defineExtension, defineTool, requester, Type, type Extension } from "@ithousecall/chat";

type Jira = { baseUrl: string; authorization: string };

type SearchResponse = {
  issues: { key: string; fields: { summary: string; status?: { name: string } } }[];
};

async function jira<T>(config: Jira, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { authorization: config.authorization, accept: "application/json", "content-type": "application/json" },
  });
  if (!response.ok) throw new Error(`Jira answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

function jiraExtension(config: Jira): Extension {
  return defineExtension({
    name: "jira",
    tools: [
      defineTool({
        name: "jira_search",
        description:
          'Search Jira issues with JQL, for example: project = IT AND text ~ "vpn" AND statusCategory != Done. ' +
          "Issues are created by a shared API account, so currentUser() is that account, not the person asking.",
        parameters: Type.Object({ jql: Type.String() }),
        execute: async (args) => {
          const query = new URLSearchParams({ jql: args.jql, fields: "summary,status", maxResults: "10" });
          const found = await jira<SearchResponse>(config, `/rest/api/3/search/jql?${query.toString()}`);
          const lines = found.issues.map(
            (issue) =>
              `${issue.key} [${issue.fields.status?.name ?? "?"}] ${issue.fields.summary} ${config.baseUrl}/browse/${issue.key}`,
          );
          return { output: [{ type: "text", text: lines.length === 0 ? "No issues found." : lines.join("\n") }] };
        },
      }),
      defineTool({
        name: "jira_create_issue",
        description: "Create a Jira issue, for example a ticket for a problem the docs could not solve.",
        parameters: Type.Object({
          project: Type.String({ description: "Project key, like IT" }),
          summary: Type.String(),
          description: Type.String(),
        }),
        write: true,
        summary: (args) => `Create a Jira issue in ${args.project}: "${args.summary}"`,
        execute: async (args, api, context) => {
          const asker = await requester(api, context);
          const reportedBy = `Reported in chat by ${asker?.name ?? asker?.id ?? "an unknown user"}.`;
          const created = await jira<{ key: string }>(config, "/rest/api/3/issue", {
            method: "POST",
            body: JSON.stringify({
              fields: {
                project: { key: args.project },
                issuetype: { name: "Task" },
                summary: args.summary,
                description: {
                  type: "doc",
                  version: 1,
                  content: [args.description, reportedBy].map((text) => ({
                    type: "paragraph",
                    content: [{ type: "text", text }],
                  })),
                },
              },
            }),
          });
          return {
            output: [{ type: "text", text: `Created ${created.key}: ${config.baseUrl}/browse/${created.key}` }],
          };
        },
      }),
    ],
  });
}

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;

export default JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN
  ? jiraExtension({
      baseUrl: JIRA_BASE_URL.replace(/\/+$/, ""),
      authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`,
    })
  : defineExtension({ name: "jira" });
