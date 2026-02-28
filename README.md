# Simple Pong

Open `index.html` in your browser to play. Controls:
- Left paddle: `W` / `S`
- Right paddle: `Arrow Up` / `Arrow Down`
- `Space` to pause/resume

Files:
- `index.html` — game page
- `style.css` — styles
- `game.js` — game logic

AI opponent:
- Use the `Enable AI` checkbox at the top to turn on the AI for the right paddle.
- Select `Difficulty` (Easy / Medium / Hard) to change AI behavior. Settings persist in `localStorage`.

Audio & win condition:
- A short sound plays each time the ball is hit by a paddle.
- A score sound plays when a player scores.
- The game ends when either player reaches 10 points — a victory melody plays and an overlay announces who won.
- Press `Space` to restart after the game ends.

