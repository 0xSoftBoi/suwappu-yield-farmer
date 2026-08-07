# Security Policy

This repository is a satellite / example application built on the
[Suwappu API](https://github.com/0xSoftBoi/suwappubot). This repository is
read-only: its remote calls list/read lending markets, while snapshot comparison
reads local JSON files. It does not accept wallet private keys or create lending
transactions. Treat Suwappu API keys, local snapshots, dependencies, and CI
configuration as sensitive.

An API key is optional for this repository's public lending REST reads. If you
set `SUWAPPU_API_KEY` for other authenticated Suwappu surfaces or hosted MCP,
keep it in your environment or secret manager and never commit it.

## Reporting a vulnerability

**Do not open a public issue for security reports.** Instead:

- Use **GitHub Private Vulnerability Reporting** when it is enabled for this repository, or
- Email **security@suwappu.bot**.

Please include the affected file, version or commit, reproduction steps, and an
impact assessment.

**Scope note:** issues in this repository's own code, SDK usage, dependencies,
or CI belong here. Vulnerabilities in the Suwappu API, core bot, smart
contracts, custody/key-management layer, or shared SDK should be reported
upstream through the
[core security policy](https://github.com/0xSoftBoi/suwappubot/security/policy).

## Capability boundary

The `markets`, `detail`, and `snapshot` commands perform remote reads. The
`changes` command reads two user-selected local files and performs deterministic
comparison only. None of these commands should silently acquire transaction,
wallet-signing, or token-approval behavior in a future update.

If an application adds Morpho/Suwappu execution, keep that capability behind a
separate command and authorization boundary, validate chain and market identity,
and follow the upstream core security policy. Never commit credentials.

## Our commitment

- **Acknowledge** reports within 3 business days.
- **Triage and severity** within 7 business days.
- **Coordinate disclosure** with the reporter and provide credit unless
  anonymity is requested.

## Safe harbor

Good-faith research conducted under this policy, without privacy violations,
data destruction, or service degradation, will not result in legal action from
us. If in doubt, contact us before testing.
