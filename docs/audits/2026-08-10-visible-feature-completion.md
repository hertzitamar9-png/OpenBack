# Visible feature completion audit

This audit covers player-reachable OpenBack surfaces. It deliberately excludes
dormant subscription and payment functions that have no catalog items and no
visible entry point.

| Surface                                        | Player-visible functions                                                          | Local implementation                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Account and profile                            | email sessions, profile fields, profile image, logout, account deletion           | Persistent auth state and profile-image store                  |
| Friends and social                             | requests, blocking, presence, direct chats, group chats                           | AuthServer routes plus live social events                      |
| Clans                                          | creation, membership, requests, moderation, chat, public pages, leaderboard       | Persistent clan registry and chat routes                       |
| Store                                          | flags, patterns, skins, crowns, effects, Tribe names                              | Store-currency purchase route and persistent Tribe registry    |
| Tribes                                         | purchase, ownership, boosts, public stats, leaderboard, multiplayer bot injection | PostgreSQL-backed registry and internal game-server pool route |
| Ranked                                         | visible ranked boards and matchmaking modes                                       | Ranked leaderboard and MatchmakingService                      |
| Game history                                   | completed multiplayer records and profile history                                 | Authoritative archive and persistent summaries                 |
| Tutorials, Blog, News, legal and service pages | navigation and content                                                            | Same-origin static/server-rendered content                     |

The audit also enforces three fail-closed rules in tests: no browser-native
dialogs, no visible payment panels without products, and a local route for each
visible account, Store, Tribe, and leaderboard service.
