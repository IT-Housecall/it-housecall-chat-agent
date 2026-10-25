import { start } from "@ithousecall/chat";
import jira from "./extensions/jira.ts";

await start({ config: "config/config.yaml", data: "data", extensions: [jira] });
