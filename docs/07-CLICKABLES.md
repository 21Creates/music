# 07 — Clickables (Complete Interactive Inventory)

Total: ~413 interactive elements across all pages/components.

## Auth Screen (`AuthScreen.tsx`)
| Element | Line | Action |
|---|---|---|
| Display name input | 73 | Enter display name (signup) |
| Email input | 85 | Enter email |
| Password input | 96 | Enter password |
| Sign In/Sign Up tabs | 67-68 | Switch auth mode |
| Submit button | 106 | Call `signIn()` or `signUp()` |

## Home Page (`HomePage.tsx`)
| Element | Line | Action |
|---|---|---|
| Room search input | 163 | Filter public rooms |
| Invite code button | 155 | Open InviteRedeemModal |
| Room card (member) | 142/301 | Navigate to room |
| Room card (non-member) | 236/258 | Navigate to room |
| Join Room button | 281 | Call `join_room` RPC |
| Request to Join | 287 | Call `join_room` (request mode) |
| Passphrase input | 265 | Enter passphrase |
| Create Room FAB | 206 | Open CreateRoomModal (or limit toast) |
| Room name/description/visibility/join policy/passphrase | 355-394 | Create room form fields |
| Discoverable toggle | 405 | Toggle flag |
| Theme color picker | 418 | Select color (x8) |
| Create Room submit | 430 | Call `create_room` RPC |
| Invite code input + Redeem | 471/478 | Call `redeem_invite` RPC |

## Room Page (`RoomPage.tsx`)
### Hero
| Back button | 138 | Navigate to `#/` |
| Share button (admin) | 165 | Open InviteShareModal |
| Settings button (admin) | 166 | Open RoomSettingsModal |

### Tab bar (6 tabs)
Queue, Chat, Members, Polls, Games, Top Charts — all at line 225

### Queue Tab
| Add Music button | 300/312 | Open UploadModal |
| Track play button | 327 | Play track |
| Cover art file input | 349 | Upload cover |
| Track delete | 355 | Delete track + audio |
| Offline toggle | 343 | Save/remove offline |

### Chat Tab
| Message input | 894 | Type message (with @mention) |
| Send button | 901 | Insert to `room_messages` |
| Attach media (+) | 876 | Toggle media menu (premium) |
| Share track | 887 | Toggle track picker |
| Image/video upload | 857/862 | Upload to vinyl-chat (premium) |
| GIF search | 865/782 | Search Giphy |
| GIF result | 791 | Select GIF |
| Track share picker | 812 | Select track to share |
| Mention track | 829/839 | Mention track in message |
| Reply button | 737 | Set reply target |
| Delete message | 739 | Delete own message |
| Media viewer close | 908 | Close viewer |
| Shared track play | 717 | Play shared track |

### Members Tab
| Approve member | 985 | Call `approve_join_request` |
| Reject member | 988 | Call `reject_join_request` |
| Role select | 1027 | Change member role |
| Remove member | 1034 | Delete room_members row |

### Upload Modal
| File drop zone | 1172 | Open file picker |
| File input (audio/video) | 1180 | Select files |
| Track title input | 1213 | Edit title |
| Cover art input | 1204 | Upload cover per track |
| Remove draft | 1227 | Remove from list |
| Upload button | 1260 | Upload all to storage + DB |
| Cancel/close | 1258/1168 | Close modal |

## Room Settings Modal (`RoomSettingsModal.tsx`)
| Invite code display + copy | 96-97 | Copy to clipboard |
| Room name/description/visibility/join policy | 106-122 | Edit room fields |
| Discoverable toggle | 132 | Toggle flag |
| Theme color picker | 152 | Select color (x7) |
| Member role select | 177 | Change role |
| Remove member | 185 | Remove member |
| Save Changes | 198 | Update room in DB |
| Generate invite | 285 | Create invitation |
| Copy invite link | 307 | Copy to clipboard |

## Jam Banner (`JamBanner.tsx`)
| Start Jam | 86 | Call `start_jam` RPC |
| End Jam | 116 | Call `end_jam` RPC |
| Join | 120 | Navigate to room |

## Polls Tab (`PollsTab.tsx`)
| New Poll | 93 | Open CreatePollModal |
| Vote option | 132 | Insert poll_vote |
| Question/type/multi-choice | 202-209 | Poll form fields |
| Option inputs | 216 | Enter options |
| Add/remove option | 223/230 | Manage options |
| Create (submit) | 237 | Insert poll + options |

## Games Tab (`GamesTab.tsx`)
| New Game | 257 | Open CreateGameModal |
| Game card | 278 | Open game detail |
| Start Playing | 230 | Insert game_plays |
| Answer choice | 196 | Submit answer |
| Next/Finish | 208 | Advance or finish |
| Title/type/duration | 351-360 | Game form fields |
| Question/answer/choices | 373-377 | Question fields |
| Add/remove question | 368/382 | Manage questions |
| Create Game (submit) | 388 | Insert game_session + questions |

## Mini Player (`MiniPlayer.tsx`)
| Expand | 48 | Open NowPlayingView |
| Previous | 78 | Previous track |
| Play/Pause | 79 | Toggle playback |
| Next | 82 | Next track |
| Mute | 94 | Toggle mute |
| Volume slider | 97 | Set volume |

## Now Playing View (`NowPlayingView.tsx`)
| Close (X/backdrop) | 79/77 | Close view |
| Seek bar | 108 | Seek to position |
| Like/Heart | 125 | Toggle like (local state only — non-functional) |
| Previous/Play-Pause/Next | 128-132 | Playback controls |
| Share | 133 | Copy room link |
| Mute + Volume | 138/141 | Audio controls |
| Mix Mode | 144 | Toggle mix mode (premium) |
| Offline toggle | 155 | Save/remove offline |

## Sidebar (`Sidebar.tsx`)
| Discover/Offline/Profile nav | 42 | Navigate to routes |
| Go Premium | 58 | Navigate to `#/profile` |
| Notifications bell | 56 | Open dropdown |
| User menu + Sign Out | 67/85 | Toggle menu / sign out |

## Mobile Nav (`MobileNav.tsx`)
| Home/Offline/Profile tabs | 51 | Navigate to routes |
| Crown/Avatar | 31/35 | Navigate to `#/profile` |
| Notifications bell | 29 | Open dropdown |

## Notifications Bell (`NotificationsBell.tsx`)
| Bell | 44 | Toggle dropdown |
| Mark all read | 62 | Mark all read |
| Notification item | 76 | Mark read + navigate |

## Install Prompt (`InstallPrompt.tsx`)
| Dismiss (X) | 81 | Dismiss + save to localStorage |
| Not now | 118 | Dismiss + save |
| Install | 121 | Trigger `beforeinstallprompt` |

## Profile Page (`ProfilePage.tsx`)
| Avatar upload | 95 | Upload to vinyl-avatars |
| Overview/Settings/Premium tabs | 129 | Switch tabs |
| Display name/avatar URL inputs | 176/180 | Edit profile |
| Email (disabled) | 184 | Display only |
| Save Changes | 186 | Update profiles table |
| Notification toggles (x5) | 201 | Non-functional (local state only) |
| Volume slider | 214 | Set audioManager volume |
| Crossfade toggle | 218 | Toggle crossfade |
| Sign Out | 223 | Sign out |
| Upgrade to Premium | 246 | Open SubscribeModal |

## Offline Screen (`OfflineScreen.tsx`)
| Play track | 146 | Play offline track |
| Remove track | 160 | Remove from offline |
| Remove all | 119 | Remove all offline tracks |

## Subscribe Modal (`SubscribeModal.tsx`)
| Payment ref input | ~120 | Enter reference |
| Receipt file input | ~130 | Upload receipt image |
| Submit | ~140 | Upload + insert subscription + call edge function |
| Close | ~100 | Close modal |

## Admin Page (`AdminPage.tsx`) — 12 tabs
### Login
| Password input | 182 | Enter admin password |
| Login button | 188 | Call `verify_admin_password` |

### Tab bar: Overview, Users, Rooms, Premium, Ads, Announcements, Analytics, Logs, Export, Bug Check, Webhook, Settings (x12 tabs)

### Users Tab
Search input, Grant/Revoke Premium buttons, Ban/Unban buttons

### Rooms Tab
Search input, Delete room button

### Premium Tab
Approve/Reject subscription buttons

### Ads Tab
Create/Toggle/Edit/Delete Ad buttons, title/content inputs

### Announcements Tab
Textarea + Send button (`admin_send_announcement`)

### Analytics Tab
Days range buttons (7/14/30/90) — line 2032

### Logs Tab
Search input (2144), action type select (2146), Export button (2157), Load More (2183)

### Export Tab
Export Everything (2252), per-table Export buttons (x6, line 2268)

### Bug Check Tab
Re-run Check (2328), Fix button per issue (2354)

### Webhook Tab
Webhook URL input, Save, Test Ping, Copy Apps Script

### Settings Tab
Max Rooms Free/Premium inputs (2459/2462), Popup Title/Body/CTA inputs (2468-2476), Save and Publish (2478), Add/Edit Payment (2489/2502), Change Password form (2518-2537), Payment Form modal (2593-2628)

### Always visible
Tab buttons (x12), Logout button (~155)
