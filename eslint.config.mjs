import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // ── Build- és eszköz-artefaktumok ────────────────────────────────────────
    // FONTOS: a mintáknak `**/` előtaggal kell kezdődniük, különben CSAK a repo
    // gyökerében illeszkednek. A korábbi (gyökérhez kötött) `.next/**` miatt az
    // eslint bejárta a `.claude/worktrees/*/.next/**` alatti GENERÁLT JS-t, és
    // több ezer értelmetlen hibát jelzett a valódi forráshibák mellett — emiatt
    // a lint használhatatlan volt, és a CI-ban ki lett kapcsolva.
    // A `**/` előtag a gyökérszintű találatot is lefedi.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/next-env.d.ts",

    // Claude Code munkakönyvtárai (worktree-k, scratch) — nem forráskód.
    "**/.claude/**",
  ]),
]);

export default eslintConfig;
