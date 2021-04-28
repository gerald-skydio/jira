const parseSmartCommit = require('./smart-commit');
const { getJiraId } = require('../jira/util/id');

function mapStatus({ state, merged }) {
  if (state === 'merged') {
    return 'MERGED';
  } else if (state === 'open') {
    return 'OPEN';
  } else if (state === 'closed' && merged) {
    return 'MERGED';
  } else if (state === 'closed' && !merged) {
    return 'DECLINED';
  } else {
    return 'UNKNOWN';
  }
}

module.exports = (payload, author) => {
  // eslint-disable-next-line camelcase
  const { pull_request, repository } = payload;
  // This is the same thing we do in sync, concat'ing these values
  const { issueKeys } = parseSmartCommit(`${pull_request.title}\n${pull_request.head.ref}`);

  if (!issueKeys || !pull_request.head.repo) {
    return { data: undefined };
  }

  const pullRequestStatus = mapStatus(pull_request);

  let data = {
    data: {
      id: repository.id,
      name: repository.full_name,
      url: repository.html_url,
      branches: [
        {
          createPullRequestUrl: `${pull_request.head.repo.html_url}/pull/new/${pull_request.head.ref}`,
          lastCommit: {
            author: {
              name: author.login,
            },
            authorTimestamp: pull_request.updated_at,
            displayId: pull_request.head.sha.substring(0, 6),
            fileCount: 0,
            hash: pull_request.head.sha,
            id: pull_request.head.sha,
            issueKeys,
            message: 'n/a',
            updateSequenceId: Date.now(),
            url: `${pull_request.head.repo.html_url}/commit/${pull_request.head.sha}`,
          },
          id: getJiraId(pull_request.head.ref),
          issueKeys,
          name: pull_request.head.ref,
          url: `${pull_request.head.repo.html_url}/tree/${pull_request.head.ref}`,
          updateSequenceId: Date.now(),
        },
      ],
      pullRequests: [
        {
          author: {
            avatar: author.avatar_url,
            name: author.login,
            url: author.html_url,
          },
          commentCount: pull_request.comments,
          destinationBranch: `${pull_request.base.repo.html_url}/tree/${pull_request.base.ref}`,
          displayId: `#${pull_request.number}`,
          id: pull_request.number,
          issueKeys,
          lastUpdate: pull_request.updated_at,
          sourceBranch: pull_request.head.ref,
          sourceBranchUrl: `${pull_request.head.repo.html_url}/tree/${pull_request.head.ref}`,
          status: pullRequestStatus,
          timestamp: pull_request.updated_at,
          title: pull_request.title,
          url: pull_request.html_url,
          updateSequenceId: Date.now(),
        },
      ],
      updateSequenceId: Date.now(),
    },
  };

  // Do not send the branch on the payload when the Pull Request Merged event is called.
  // Reason: If "Automatically delete head branches" is enabled, the branch deleted and PR merged events might be sent out “at the same time” and received out of order, which causes the branch being created again.
  if (pullRequestStatus === 'MERGED') {
    data.data.branches = [];
  }

  return data;
};
