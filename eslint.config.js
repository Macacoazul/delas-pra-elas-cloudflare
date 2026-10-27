import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['para-colar/**', 'node_modules/**', 'site/**', '.wrangler/**', 'test/e2e/.build/**', 'test/e2e/capturas/**'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.serviceworker } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  // O servidor roda no Workers: nada de Buffer, process ou require.
  { files: ['src/**/*.js'], rules: { 'no-restricted-globals': ['error', 'Buffer', 'process', 'require'] } },
  // O app e a tela de Fretes rodam no navegador.
  { files: ['app/**/*.js', 'app/**/*.jsx', 'test/e2e/**/*.js'], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  // No JSX o ESLint comum não vê que <Componente /> usa o componente; por isso nomes com inicial maiúscula (e o React) não são cobrados aqui.
  {
    files: ['app/**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$|[A-Z])', ignoreRestSiblings: true, caughtErrors: 'none' }] },
  },
];
