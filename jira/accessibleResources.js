const getAccessibleResources = (token) => {
  return fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    method: "GET",
    headers: {
      Authorization: token,
    },
  }).then(async (response) => {
    if (response.status === 200) {
      return await response.json();
    }
    const errorText = await response.text();
    throw new Error(`Failed to get accessible resources: ${response.status} ${response.statusText} - ${errorText}`);
  });
};

module.exports = { getAccessibleResources };
