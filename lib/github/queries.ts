// Latest releases, newest first. Drafts and prereleases are filtered out after the fetch.
export const RELEASES_QUERY = /* GraphQL */ `
  query Releases($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          tagName
          name
          publishedAt
          isPrerelease
          isDraft
        }
      }
    }
  }
`;

// One GraphQL point per 100 commits, against a separate budget from the REST API.
// GraphQL gives per-commit totals but not the list of changed files.
export const COMMIT_HISTORY_QUERY = /* GraphQL */ `
  query CommitHistory($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: $first, after: $after) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                committedDate
                messageHeadline
                additions
                deletions
                changedFilesIfAvailable
                author {
                  name
                  user {
                    login
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
