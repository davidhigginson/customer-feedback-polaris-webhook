const getIssue = (token, cloudId, issueKey) => {
  return fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}?fields=project,summary,description`, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  }).then(async (response) => {
    if (response.status === 200) {
      return await response.json();
    }
    const errorText = await response.text();
    throw new Error(`Failed to get issue: ${response.status} ${response.statusText} - ${errorText}`);
  });
};

module.exports = { getIssue };
