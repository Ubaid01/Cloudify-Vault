import eslintPluginNode from 'eslint-plugin-node';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import prettierPlugin from 'prettier';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      node: eslintPluginNode,
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
    },
    rules: {
      'spaced-comment': 'off',
      'prefer-arrow-callback': 'off',
      'no-console': 'off',
      'consistent-return': 'off',
      'arrow-body-style': 'off',
      'func-names': 'off',
      'object-shorthand': 'off',
      'no-process-exit': 'off',
      'no-param-reassign': 'off',
      'no-return-await': 'off',
      'no-underscore-dangle': 'off',
      'class-methods-use-this': 'off',
      'import/newline-after-import': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'import/no-extraneous-dependencies': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|val' }],
    },
  },
];
