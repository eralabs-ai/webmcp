module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Dependabot commit bodies embed dependency metadata and release-note
  // links well past body-max-line-length and are not configurable; skip
  // its commits entirely (the PR title is still linted separately in CI).
  ignores: [(message) => message.includes('Signed-off-by: dependabot[bot]')],
  rules: {
    // Dependabot capitalizes subjects ("chore(deps): Bump typescript ...")
    // and cannot be configured otherwise; type/scope rules still apply.
    'subject-case': [0],
  },
};
