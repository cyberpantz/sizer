# Installing

```
pnpm install
```

pnpm 10.20. Settings live in **`pnpm-workspace.yaml`**, not `package.json` —
pnpm stopped reading the `pnpm` field there, silently, and the only sign was a
warning buried in install output.

## Three settings, all load-bearing

**`nodeLinker: hoisted`** — `@astrojs/cloudflare` imports
`@astrojs/internal-helpers` without declaring it. npm's flat `node_modules` hid
that; pnpm's strict layout fails the build with
`Rolldown failed to resolve import "@astrojs/internal-helpers/request"`.
pnpm is right and the package is wrong; we are not fixing Astro's packaging.

**`onlyBuiltDependencies`** — pnpm blocks postinstall scripts by default.
esbuild and workerd use theirs to fetch platform-specific binaries. Without it:
`Cannot start service: Host version "0.28.1" does not match binary version "0.28.2"`.

**`overrides: esbuild 0.28.2`** — two majors were installed side by side. Under
a hoisted layout one binary wins and it must be the one the host expects.

## If the lockfile config changes

```
pnpm install --no-frozen-lockfile
```

pnpm refuses a frozen install when `overrides` differs from the lockfile.

## History

The repo briefly had **both** `package-lock.json` and `pnpm-lock.yaml` — one
person on npm, one on pnpm. That is what produced the version mismatch.
`package-lock.json` is gone. Use pnpm.
