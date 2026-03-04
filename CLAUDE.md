# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This is a new project. Architecture and build instructions will be added as the codebase develops.

## Secrets Management

This project uses the cross-project secrets framework. API keys and secrets are stored in `.secrets/` (gitignored).

- **Add a secret**: `bash .secrets/secrets.sh add <KEY>` or `/secrets add <KEY>`
- **Use a secret**: `bash .secrets/secrets.sh get <KEY>` or `/secrets get <KEY>`
- **List secrets**: `bash .secrets/secrets.sh list` or `/secrets list`
- **Encrypt**: `bash .secrets/secrets.sh encrypt <KEY>` (AES-256-CBC, PBKDF2 100k iterations)
- **Security audit**: `bash .secrets/secrets.sh status` or `/secrets status`

**Security**: Never output secret values in chat. Always verify `.secrets/` is in `.gitignore` before operations.
