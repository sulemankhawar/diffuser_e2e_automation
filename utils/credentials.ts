// Resolves SAP test-user passwords from env vars so no secret is committed to source control.
export function getPasswordForUser(username: string): string {
  const perUserVar = `SAP_PASSWORD_${username.toUpperCase()}`;
  const password = process.env[perUserVar] || process.env.SAP_TEST_PASSWORD;

  if (!password) {
    throw new Error(
      `Missing password for SAP user "${username}". Set ${perUserVar} or SAP_TEST_PASSWORD in .env.local (see .env.local.example).`,
    );
  }

  return password;
}
