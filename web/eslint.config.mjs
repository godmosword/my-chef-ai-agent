import tseslint from "typescript-eslint";

/** Pure domain modules must not depend on platform/application/UI. */
const domainPureFiles = [
  "domain/pantry/**/*.ts",
  "domain/cook/**/*.ts",
  "domain/recipe/recipe-steps.ts",
  "domain/recipe/decision-summary.ts",
  "domain/recipe/recipe-scale.ts",
  "domain/plan/filter-pantry.ts",
];

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "scripts/**",
      "**/*.mjs",
      "**/*.test.ts",
    ],
  },
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: domainPureFiles,
  })),
  {
    files: domainPureFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/platform/*", "@/application/*"],
              message: "Pure domain must not import platform or application layers.",
            },
            {
              group: ["@/components/*", "@/app/*"],
              message: "Domain must not import UI or routes.",
            },
          ],
        },
      ],
    },
  },
);
