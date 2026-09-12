// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // A weight without the font file that carries it. Android draws a faux
          // weight wider than the layout measured, and a label sized to its text
          // wraps and clips its last word — "+ Add subcategory" rendered as
          // "+ Add". Use a *Strong typography token, or pair fontWeight with the
          // matching fonts.* family. See docs/design-system.md.
          selector:
            // An attribute path, not `> SpreadElement > MemberExpression`: esquery does
            // not match a chained child selector inside :has, and that form silently
            // flagged nothing.
            "ObjectExpression:has(> SpreadElement[argument.object.name='typography']):has(> Property[key.name='fontWeight']):not(:has(> Property[key.name='fontFamily']))",
          message:
            "Unpaired fontWeight on a typography token clips text on Android. Use typography.captionStrong/bodyStrong/labelStrong, or add the matching fontFamily from fonts.*.",
        },
        {
          // The same fault with no typography spread at all: the text falls back
          // to the system font instead of Manrope, and still gets a faux weight.
          selector:
            "JSXAttribute[name.name='style'] ObjectExpression:has(> Property[key.name='fontWeight']):not(:has(> Property[key.name='fontFamily'])):not(:has(> SpreadElement))",
          message:
            "fontWeight without fontFamily renders in the system font with a faux weight. Use a typography token or add fontFamily from fonts.*.",
        },
      ],
    },
  },
]);
