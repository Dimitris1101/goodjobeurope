/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "next",
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    // Κάνε το 'any' warning (ή off αν προτιμάς)
    "@typescript-eslint/no-explicit-any": "warn", // ή "off"
    // Να μην φωνάζει όταν βάζεις // @ts-ignore κ.λπ. (χρήσιμο προσωρινά)
    "@typescript-eslint/ban-ts-comment": "off",
    // Συχνά ενοχλητικό σε ταχείες υλοποιήσεις
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  },
};