module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Dependabot capitalizes subjects ("chore(deps): Bump typescript ...")
    // and cannot be configured otherwise; type/scope rules still apply.
    'subject-case': [0],
  },
};
