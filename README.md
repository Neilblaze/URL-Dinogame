# URL-Dinogame 🦖

A lightweight implementation of the classic Dinosaur game, played entirely within the browser's address bar. 

Play the [Live Demo](https://neilblaze.github.io/URL-Dinogame/) ✨

<p align="left">
    <a href="https://github.com/Neilblaze/URL-Dinogame"><img src="https://img.shields.io/github/repo-size/Neilblaze/URL-Dinogame" alt="Repo-Size"/></a>
    <a href="https://github.com/Neilblaze/URL-Dinogame/blob/master/LICENSE"><img src="https://img.shields.io/github/license/Neilblaze/URL-Dinogame?style=flat-square" alt="License"/></a>
    <a href="https://github.com/Neilblaze/URL-Dinogame"><img src="https://img.shields.io/github/last-commit/Neilblaze/URL-Dinogame" alt="last-commit"/></a>
    <a href="https://hitsofcode.com/view/github/Neilblaze/URL-Dinogame"><img src="https://hitsofcode.com/github/Neilblaze/URL-Dinogame" alt="Hits-of-Code"/></a>
</p>

> [!NOTE]
> This project was recently updated to address browser compatibility issues. For context, invisible characters (previously used in this project) and spaces, such as the Zero-Width Space (U+200B), pose a significant security risk because they allow attackers to create homograph URLs that appear identical to legitimate sites but lead to phishing or malware. To counter this, Chrome and other Chromium-based browsers (like Edge and Brave) have implemented sophisticated protections that detect these hidden Unicode characters and automatically "defang" them by displaying the URL in Punycode (e.g., `xn--...`), which was breaking the aesthetics of the game.

## Interactive Web Demo 🔻
https://github.com/user-attachments/assets/4188609e-6b4a-43c4-ba83-09ab7c000348


---


## Character Legend

| Character | Entity | Description |
| :--- | :--- | :--- |
| `C` | Player | Your dinosaur character. |
| `•` | Food | Basic pickup (+1 point). |
| `@` | Fruit | Rare pickup (+5 points). |
| `X` | Enemy | Obstacle to avoid (-1 point/Death). |
| `*` | Shield | Power-up (5s invincibility). |

<br/>

## How to Play?

### 🟠 Single Player Mode

1. **Launch**: Open the [**live demo**](https://neilblaze.github.io/URL-Dinogame/) or `index.html` in a desktop browser.
2. **Start**: Press any key to begin the 3-second countdown.
3. **Controls**: Use the `Up Arrow` or `Spacebar` to jump and dodge obstacles.
4. **Goal**: Survive as long as possible while collecting pickups to maximize your score.

### 🟢 Multiplayer Mode 🆕

Play with up to 6 players in real-time P2P multiplayer!

#### Creating a Room (Host) 🔻

1. Click the **"Multiplayer"** button in the top-right corner
2. Enter your name (max 16 characters)
3. Click **"Create Room"**
4. Share the generated room name or copy the invite link
5. Wait for players to join (max 6 players)
6. Click **"Start Game"** when everyone is ready

#### Joining a Room (Client) 🔻

1. Click the **"Multiplayer"** button
2. Enter your name (max 16 characters)
3. Click **"Join Room"**
4. Paste the invite link or enter the room name
5. Click **"Ready ✓"** when you're prepared
6. Wait for the host to start the game

#### Deep Link Joining 🔻

You can also join directly via URL: `https://neilblaze.github.io/URL-Dinogame/?room=<PEER_ID>`

#### Multiplayer Features 🔻

- **Live Leaderboard**: See all players' scores in real-time during gameplay.
- **Host Controls**: Host can adjust difficulty and speed settings for all players.
- **Post-Game Stats**: View final rankings with winner announcement.
- **Session History**: Game logs stored locally for 7 days (IndexedDB)

#### Technicalities 🔻

- **P2P Architecture**: Serverless peer-to-peer using WebRTC (PeerJS 1.5.2)
- **Host-Authoritative**: Host validates scores and manages game state
- **Max Players**: 6 players per room
- **Score Sync**: Updates every 150ms
- **Heartbeat**: 4s interval with 10s timeout for disconnect detection (Web Worker)


> [!IMPORTANT]
> Multiplayer is desktop-only and requires a visible URL bar and full keyboard. The session is tied to your tab, i.e., refreshing disconnects you, only one session per browser is allowed, and if the host leaves, the game ends for everyone. Players behind strict NATs or firewalls may have trouble connecting, and keeping the tab focused is necessary for smooth visuals.



## 💻 Local Development

```bash
git clone https://github.com/Neilblaze/URL-Dinogame.git
cd URL-Dinogame
# Open index.html in your browser
```


---


## Troubleshooting

> [!WARNING]
> **"Multiplayer unavailable" error** — An ad-blocker or privacy extension is likely blocking the PeerJS CDN (`unpkg.com`). Disable it for this page, or try Chrome, Edge, or Firefox with extensions off.

> [!CAUTION]
> **"Could not find host" error** — Double-check the room name. If it's correct, the host may be behind a firewall blocking WebRTC. Try having the host create a fresh room and reshare the invite link.

> [!NOTE]
> **"Multiplayer already open in another tab"** — Only one multiplayer session per browser is supported. Close any other tabs running the game and try again.

> [!TIP]
> **Players can't connect** — Corporate and school networks often block P2P traffic. Both players using a VPN (or switching to mobile hotspot) usually fixes this.

> [!NOTE]
> **Game slows down when tab is backgrounded** — This is intentional browser throttling, not a bug. Keep the game tab in focus for smooth visuals. Score syncing continues in the background via Web Workers regardless.



![breaker](https://user-images.githubusercontent.com/48355572/209539106-8e1cbfc6-2f3d-4afd-b96a-890d967dd9ab.png)



## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any features or bug fixes.

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
