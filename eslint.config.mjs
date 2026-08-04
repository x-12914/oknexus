import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow intentionally-unused args/vars when prefixed with an underscore
      // (e.g. interface implementations that ignore a parameter).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Apostrophes/quotes in JSX text render correctly; this rule is noise for
      // content-heavy marketing pages, so we turn it off project-wide.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Verification/screenshot scripts are quick throwaways — don't fail on unused args.
    files: ["scripts/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
