/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/server/repositories/*'],
            message:
              'Route handlers and UI components must not import repositories directly. Go through @/server/services/*.',
          },
          {
            group: ['@/lib/email/providers/*'],
            message:
              'Import providers only through @/lib/email/registry — the service layer must not depend on a specific provider.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/server/services/**/*.ts', 'src/lib/email/registry.ts', 'src/lib/email/dispatcher.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      // Provider event-webhook endpoints legitimately import their provider's
      // signature verification helper.
      files: ['src/app/v1/providers/webhooks/**/route.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['tests/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
}
