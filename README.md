# Y4 Science Format Game

This is a static HTML game for Year 4 science experiment format practice.

## Game Modes

- `一二三木头人` - choose the correct science format before the doll catches you.
- `连一连` - click word blocks in order to rebuild the science format sentence.

## Files

- `index.html` - main game file
- `assets/intro.mp4` - intro video
- `assets/red-light.mp4` - red-light / doll phase video
- `assets/bgm-squid-game.mp3` - 一二三木头人口令 / chant audio
- `assets/correct.mp3` - correct answer sound
- `assets/wrong.mp3` - wrong answer sound
- `assets/doll.png` - doll character image
- `assets/squid-game-gamer.png` - guard character image
- `assets/doll-cutout.png` - transparent doll cutout used in the game stage
- `assets/guard-cutout.png` - transparent guard cutout used in the game stage

Do not upload old files such as `intro.mp4.mov` or `red-light.mp4.mov`.

## Run Locally

Open `index.html` in a browser.

For best video/audio behavior, run it with a local server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## Publish To GitHub Pages

1. Create a new GitHub repository.
2. Upload everything inside this folder.
3. Go to repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select `main` branch and `/root`.
7. Save.

GitHub will give you a website link after deployment.

## Audio Note

Modern browsers block autoplay with sound. The intro video can autoplay only when muted. To play intro sound, the player must click `打开声音 + BGM`. The chant audio starts when the player clicks `开始游戏`.

## Video Note

For GitHub Pages and Chrome/Safari, videos should be real H.264 MP4 files. Renaming a `.MOV` file to `.mp4` is not enough. If the video is black or stuck at `0:00`, re-export it as:

- Format: MP4
- Video codec: H.264 / AVC
- Audio codec: AAC
- Resolution: 720p or 1080p

Tools such as HandBrake, CapCut export, iMovie export, or CloudConvert can do this.
