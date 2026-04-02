# URL-Dinogame 🦖

A lightweight implemention of the classic Dinosaur game, played entirely within the browser's address bar. 

Play the [Live Demo](https://neilblaze.github.io/URL-Dinogame/) ✨

<p align="left">
    <a href="https://github.com/Neilblaze/URL-Dinogame"><img src="https://img.shields.io/github/repo-size/Neilblaze/URL-Dinogame" alt="Repo-Size"/></a>
    <a href="https://github.com/Neilblaze/URL-Dinogame/blob/master/LICENSE"><img src="https://img.shields.io/github/license/Neilblaze/URL-Dinogame?style=flat-square" alt="License"/></a>
    <a href="https://github.com/Neilblaze/URL-Dinogame"><img src="https://img.shields.io/github/last-commit/Neilblaze/URL-Dinogame" alt="last-commit"/></a>
    <a href="https://hitsofcode.com/view/github/Neilblaze/URL-Dinogame"><img src="https://hitsofcode.com/github/Neilblaze/URL-Dinogame" alt="Hits-of-Code"/></a>
</p>


> [!NOTE]
> This project was recently updated to match browser compatibility issues. For context, invisible characters (previously used in this project) and spaces, such as the Zero-Width Space (U+200B), pose a significant security risk because they allow attackers to create homograph URLs that appear identical to legitimate sites but lead to phishing or malware. To counter this, Chrome and other Chromium-based browsers (like Edge and Brave) have implemented sophisticated protections that detect these hidden Unicode characters and automatically "defang" them by displaying the URL in Punycode (e.g., `xn--...`), which was breaking the aesthetics of the game.

## Interactive Web Demo 🔻
https://github.com/user-attachments/assets/4188609e-6b4a-43c4-ba83-09ab7c000348





## Character Legend

| Character | Entity | Description |
| :--- | :--- | :--- |
| `C` | Player | Your dinosaur character. |
| `•` | Food | Basic pickup (+1 point). |
| `@` | Fruit | Rare pickup (+5 points). |
| `X` | Enemy | Obstacle to avoid (-1 point/Death). |
| `*` | Shield | Power-up (5s invincibility). |

## How to Play

1. **Launch**: Open the [live demo](https://neilblaze.github.io/URL-Dinogame/) or `index.html` in a desktop browser.
2. **Start**: Press any key to begin the 3-second countdown.
3. **Controls**: Use the `Up Arrow` to jump and dodge obstacles.
4. **Goal**: Survive as long as possible while collecting pickups to maximize your score.

## Local Development

```bash
git clone https://github.com/Neilblaze/URL-Dinogame.git
cd URL-Dinogame
# Open index.html in your browser
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any features or bug fixes.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
