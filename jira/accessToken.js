const getAccessToken = (clientId, clientSecret, redirectUri, code) => {
  return fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    }),
  }).then(async (response) => {
    if (response.status === 200) {
      const data = await response.json();
      return {
        access_token: `${data.token_type} ${data.access_token}`,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      };
    }
    const errorText = await response.text();
    throw new Error(`Failed to get token: ${response.status} ${response.statusText} - ${errorText}`);
  });
};

module.exports = { getAccessToken };
