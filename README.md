# OpenCodex token-import patch

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

This repository contains a patch and a Bun launcher that add local JSON account
import to [OpenCodex](https://github.com/lidge-jun/opencodex). It is not a fork
of OpenCodex and does not vendor its source tree.

The patched **Add Codex Account** dialog supports these formats:

- `sub2api`
- `CPA`
- `Codex` / `auth.json`

Choose a format, then either upload a JSON file or paste its contents. Pasted
JSON is checked in the browser before it can be submitted. The proxy performs
the final credential validation without returning token contents to the UI.  
<img width="601" height="611" alt="image" src="https://github.com/user-attachments/assets/073ed403-1ed9-411d-9f43-f0c5352c8d46" />
<img width="633" height="460" alt="image" src="https://github.com/user-attachments/assets/dc635b64-45ec-4ba4-84de-30675996272d" />
<img width="568" height="583" alt="image" src="https://github.com/user-attachments/assets/8c7bf4b5-7ccb-4a90-8744-0dbd74e01660" />

## Apply

Requires Bun, Git, and an existing OpenCodex installation.

```bash
bun scripts/patch.ts
```

The launcher first looks for an OpenCodex source checkout. If none is found, it
detects the global Bun installation, creates a patched source worktree under
`~/.opencodex/patched-source/`, builds it, and switches the global package link
to that worktree. The original global package is retained beside it as a dated
backup.

Options:

```bash
# Patch only a source checkout.
bun scripts/patch.ts --target=source /path/to/opencodex

# Force the global Bun-installation workflow.
bun scripts/patch.ts --target=global

# Apply and build, but leave restarting OpenCodex to you.
bun scripts/patch.ts --no-restart

# Show the detected target without changing anything.
bun scripts/patch.ts --print-source
```

Set `OPENCODEX_SOURCE_DIR` when source discovery needs a fixed checkout path.

## Notes

- An `access_token` is required. A `refresh_token` is optional: when it is
  missing or rejected, the patch still attempts an authenticated Codex check
  with the access token.
- A valid-looking JSON document is not proof that the credential is usable. The
  server verifies it with OpenAI before adding it to the account pool.
- Use only accounts and credentials you are authorized to operate, and follow
  OpenAI's applicable terms and rate limits.

## Contents

- `patches/cpa-sub2-token-import.patch` — patch applied to an OpenCodex source checkout.
- `scripts/patch.ts` — target discovery, patch, build, and restart launcher.
