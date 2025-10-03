const createIssue = (token, cloudId, projectKey, issueData) => {
  const { summary, description, createdBy, impact } = issueData;
  
  // Create issue payload
  const issuePayload = {
    fields: {
      project: {
        key: projectKey
      },
      summary: summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description
              }
            ]
          }
        ]
      },
      issuetype: {
        name: "Task" // You can change this to "Bug", "Story", etc.
      },
      // Add custom fields if needed
      ...(createdBy && {
        customfield_10001: createdBy // Adjust field ID based on your JIRA setup
      }),
      ...(impact && {
        customfield_10002: impact // Adjust field ID based on your JIRA setup
      })
    }
  };

  return fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issuePayload),
  }).then(async (response) => {
    if (response.status === 201) {
      const data = await response.json();
      return {
        issueKey: data.key,
        issueId: data.id,
        issueUrl: `${process.env.JIRA_CLOUD_HOST}/browse/${data.key}`
      };
    }
    const errorText = await response.text();
    throw new Error(`Failed to create issue: ${response.status} ${response.statusText} - ${errorText}`);
  });
};

module.exports = { createIssue };
