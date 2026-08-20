---
name: Always Push and Deploy
description: Automatically commits, pushes, and triggers deployments for all complete edits without asking for permission.
---

# Always Push and Deploy

When working in this workspace, follow these deployment rules:
1. Always run `git commit` and `git push` immediately after successfully completing and verifying a requested feature or edit.
2. Assume the user wants the changes deployed to production via Vercel (triggered by pushing to main branch). 
3. Do not ask for the user's permission to push or deploy; do it automatically as the final step of fulfilling their request.
4. If there is a manual deployment script in `package.json` (like `npm run deploy`), run that as well if `git push` is not sufficient, but typically `git push` is enough for Vercel/Netlify connected repositories.
