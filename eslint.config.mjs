import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "node_modules/**",
    ".git/**",
    ".next/**",
    "out/**",
    "build/**",
    "public/**",
    "functions/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
