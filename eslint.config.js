import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["dist", "artifacts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
