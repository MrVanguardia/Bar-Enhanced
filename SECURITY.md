# Security Policy

Bar Enhanced runs inside GNOME Shell and includes optional components that
interact with wallpapers, media players, system sensors and the GDM greeter.
Security reports are therefore handled separately from ordinary bug reports.

## Supported versions

| Version | Security updates |
| --- | --- |
| 4.7.x | Supported |
| 4.6.x and earlier | Not supported |
| Development snapshots | Best effort; update to the latest release first |

Security fixes are released in the latest supported version. Backports are not
guaranteed for older releases.

## Report a vulnerability privately

Do **not** publish a vulnerability, proof of concept, system logs containing
private paths, tokens, cookies, passwords or GDM configuration in a public
issue or Discussion.

1. Use the repository's **Security** tab and select **Report a vulnerability**
   when that private-reporting option is available.
2. If private reporting is temporarily unavailable, open a minimal public issue
   requesting a private security contact. Do not include vulnerability details;
   a maintainer will arrange a private channel.
3. Do not use Discussions, feature requests or ordinary bug reports for
   sensitive technical details.

Please include:

- the affected Bar Enhanced release and GNOME Shell version;
- distribution and session type (Wayland or Xorg);
- a clear impact assessment and prerequisites;
- reproducible steps or a minimal proof of concept;
- whether the issue involves GDM, a privileged helper, a download, a local
  file path, DBus/MPRIS, or injected stylesheet content; and
- any suggested mitigation, if known.

Please redact personal data and secrets. A report containing credentials should
be treated as exposed: revoke or rotate them before sending a follow-up.

## What happens next

We aim to acknowledge valid reports within **7 days** and provide a status
update within **14 days**. After triage, we will confirm scope, work on a fix
or mitigation, coordinate a disclosure date when needed, and credit reporters
who wish to be credited. Timing depends on severity, reproducibility and GNOME
Shell or distribution dependencies.

## Scope and safe testing

In scope are the extension, its bundled scripts, the GDM Center integration,
the release package and repository-managed workflows. Vulnerabilities in GNOME
Shell, GNOME, a Linux distribution, third-party extensions or modified local
files should also be reported to their respective maintainers.

Do not test against systems you do not own or administer. Avoid destructive
tests, privilege escalation beyond a controlled test environment, denial of
service, and accessing data that is not yours.
