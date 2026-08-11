# Run doc — medic (Vite + React)

## Reproduce uncommitted artifacts

A fresh checkout needs:

- **Dependencies**: `npm install` (lockfile: `package-lock.json`). Do this from the project root.
- **Env file**: `.env` is gitignored. It is already present at the project root in the main checkout; copy it into the worktree root (never symlink). It is only needed if the app requires Supabase credentials at runtime — the dev server itself starts without it.

There are no other uncommitted build artifacts; `dist/` is gitignored and produced by `npm run build`.

## Run the dev server

```bash
npm run dev
```

- Vite default port is **5173**. Ports 5173 and 5174 are frequently already occupied by other worktrees' dev servers, so prefer a free port explicitly:
  ```bash
  npm run dev -- --port <FREE_PORT> --strictPort
  ```
- Check a port is free before choosing it (e.g. `netstat -ano | grep :5175`).
- The server answers at `http://localhost:<PORT>/` once Vite prints `Local:`; confirm with a request before registering the preview.

### Detached start (Windows)

Start it hidden so it outlives the conversation, with stdout and stderr in different files (PowerShell fails if both point to one path):

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5175','--strictPort' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Then confirm it survived and is listening:

```powershell
powershell -NoProfile -Command "Get-Process -Id <pid>"
netstat -ano | grep :5175
```
