# Recorded GitHub wire responses

Captured read-only through `gh-axi` on 2026-11-24. JSON field sets are complete, not
hand-written projections. Public repository/user metadata and PR bodies are retained;
no request headers, access tokens or private repository contents are recorded.

| File | Source |
| --- | --- |
| `pull-get-open.json` | GET `/repos/timurproko/crew/pulls/11` |
| `pull-get-merged.json` | GET `/repos/timurproko/crew/pulls/10` |
| `pull-list-open.json` | GET `/repos/timurproko/crew/pulls?state=all&head=timurproko:feature/status-fleet-view&per_page=2` |
| `pull-search.json` | GET `/search/issues?q=repo:timurproko/crew is:pr&per_page=1` |
| `rest-not-found.json` | GET `/repos/timurproko/crew/pulls/36`, HTTP 404 |
| `rest-permission.json` | GET `/repos/octocat/Hello-World/actions/secrets`, HTTP 403; a real read-permission refusal, not a fabricated missing-PR response |
| `rest-authentication.json` | GET `/repos/timurproko/crew/pulls/11`, HTTP 401 with an intentionally invalid, non-secret token; no credentials were changed |
| `graphql-open.json` | Exact proof query for crew PR 11 |
| `graphql-not-found.json` | Same proof query for crew PR 36; readable repository/PR connection and nullable PR with field-specific NOT_FOUND |
| `graphql-unreadable.json` | Same proof query for a nonexistent repository; repository access is unproven, indistinguishable from a hidden repository |

The proof query selects `repository.nameWithOwner`, `pullRequests(first:1).totalCount`
and `pullRequest(number).{url,state,mergedAt,closedAt}`. `.meta` files preserve the CLI
exit status and refusal diagnostic for error cases. A temporary, endpoint-whitelisted
Node I/O recorder retained actual API stdout before the wrapper normalized failures.
Successful captures used full JSON serialization so wrapper display truncation cannot
remove fields.

Tests clone these responses and adapt only identities, branch/head and time values for
isolated repositories and boundary cases. They do not remove unused fields. In
particular, REST `url` remains an `api.github.com` URL while `html_url` is the web URL;
GraphQL `url` is already a web URL. List/search envelopes and permission/404 bodies are
not interchangeable. Malformed/oversized/timeout injections elsewhere intentionally
exercise transport failures rather than pretend to be successful GitHub responses.
