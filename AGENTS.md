# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Git workflow (owner's rule — follow it every time)

- Never commit directly to `main`. For each feature/fix: create a
  `feat/…` or `fix/…` branch off main, commit there, push the branch,
  then merge to main and push main.
- Merge to main only after the owner has seen the change working in
  Expo Go on their phone (typecheck + tests are not enough).
- No Co-Authored-By trailers on commits in this repo.

# Seeing changes on the phone (Expo Go)

Expo Go does not pull from git — it loads the JS bundle from the local
Metro dev server. After building a feature, start (or restart) the dev
server yourself so the owner doesn't have to:

    npx expo start -c   # -c clears Metro's cache; run in background

While it runs, saved edits hot-reload on the phone via Fast Refresh
(press `r` in the terminal to force a full reload). If the phone shows
stale code, the server is stale or stopped — restart it with `-c`.
