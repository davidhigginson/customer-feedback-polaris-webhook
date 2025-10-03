async function requestToken(body) {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get token: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return {
    access_token: `${data.token_type} ${data.access_token}`,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope,
    token_type: data.token_type,
  };
}

const getAccessTokenWithAuthCode = (clientId, clientSecret, redirectUri, code) => {
  return requestToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });
};

const refreshAccessToken = (clientId, clientSecret, refreshToken) => {
  return requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
};

module.exports = { getAccessTokenWithAuthCode, refreshAccessToken };
