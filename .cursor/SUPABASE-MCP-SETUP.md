# Supabase MCP setup (step-by-step)

Use these steps to connect Cursor to Supabase using a Personal Access Token (no OAuth). This config uses the **local MCP server** (stdio) so it works on Windows and avoids the hosted endpoint’s “Unrecognized client_id” error.

---

## Step 1: Create a Supabase access token

1. Open your browser and go to: **https://supabase.com/dashboard/account/tokens**
2. Log in to Supabase if you’re not already.
3. Click **“Generate new token”** (or “Create token”).
4. Enter a name (e.g. `Cursor MCP`).
5. Click **Create** / **Generate**.
6. **Copy the token** and store it somewhere safe (you won’t see it again).  
   It will look like: `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Put the token in the MCP config

1. In Cursor, open the file: **`.cursor/mcp.json`** (in this project’s root).
2. Replace `PASTE_YOUR_SUPABASE_ACCESS_TOKEN_HERE` (inside `SUPABASE_ACCESS_TOKEN`) with your token.
3. Save the file (**Ctrl+S**).

**On Windows** the config must run `npx` via `cmd.exe` so the MCP server starts correctly. Your config should look like this (with your token in `SUPABASE_ACCESS_TOKEN`):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "C:\\Windows\\System32\\cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_your_token_here"
      }
    }
  }
}
```

- **No `--project-ref`** = you can use “List my Supabase projects” and other account-level tools.
- **`--read-only`** = SQL runs as read-only (recommended).
- **On Mac/Linux** you can use `"command": "npx"` and `"args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only"]` (no `cmd.exe`).

---

## Step 3: Restart Cursor (full restart)

1. **Fully quit Cursor** (File → Exit or close the app), then open it again.  
   A full restart is more reliable than “Developer: Reload Window” for MCP.
2. Open this project and wait a few seconds for the Supabase MCP server to start (first run may download the package).

---

## Step 4: Check that it works

1. Go to **Settings → Cursor Settings → Tools & MCP** and confirm the **supabase** server shows as connected (green).
2. In chat, ask: *“List my Supabase projects”* or *“What tables are in my database?”*
3. If the AI can call Supabase tools and return data, the setup is done.

---

## Optional: Limit to one project

If you want the MCP to use only one project (and hide account tools like `list_projects`):

1. Open **`.cursor/mcp.json`**.
2. In the `args` array, add after `"--read-only"`:  
   `"--project-ref=YOUR_PROJECT_REF"`
3. Replace **`YOUR_PROJECT_REF`** with your project ID (e.g. from the dashboard URL: `https://supabase.com/dashboard/project/abcdefgh` → use `abcdefgh`).
4. Save and **fully restart Cursor** again.

---

## If something goes wrong

- **“Unrecognized client_id”**  
  You’re still using the hosted URL (`https://mcp.supabase.com/mcp`). Remove `url`/`headers` and use the stdio config above (with `command`/`args`/`env`).

- **“‘npx’ is not recognized” or “spawn npx ENOENT” (Windows)**  
  Cursor often doesn’t see Node in PATH. The config adds Node to PATH in the command: `set PATH=C:\\Program Files\\nodejs;%PATH% && npx ...`. If Node is installed elsewhere (e.g. nvm, Scoop, or a custom folder), open a terminal where `npx` works, run `where npx`, and replace `C:\\Program Files\\nodejs` in that `set PATH=...` line in `mcp.json` with the folder that contains `npx.cmd` (e.g. `C:\\Users\\YourName\\AppData\\Roaming\\nvm\\v20.10.0` for nvm). Then fully restart Cursor.

- **No tools / server not connected**  
  Do a **full restart** of Cursor (quit and reopen). Check **Settings → Tools & MCP** and try **Refresh** for the supabase server.

- **“Unauthorized” or no data**  
  Check the token in `SUPABASE_ACCESS_TOKEN` is correct, has no extra spaces, and is the full value from the Supabase dashboard.

- **Token lost**  
  Create a new token at https://supabase.com/dashboard/account/tokens and update `SUPABASE_ACCESS_TOKEN` in `.cursor/mcp.json`.

- **Don’t commit your token**  
  `.cursor/mcp.json` is in `.gitignore` so your token is not pushed to git.
