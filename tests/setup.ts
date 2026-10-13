if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "test-auth-secret-with-sufficient-length-for-hmac-sha256";
}
