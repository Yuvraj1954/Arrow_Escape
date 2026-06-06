# Arrow Escape

A silhouette-based puzzle game where every solution reveals something hidden.

Arrow Escape combines logic puzzles with visual discovery. Each level begins as a maze of interconnected arrows. By finding the correct sequence of moves, players gradually clear the board and uncover a recognizable silhouette beneath.

The challenge comes from understanding dependencies, predicting consequences, and finding the right move order. The reward is the moment the hidden shape finally emerges.

---

## Overview

Arrow Escape is built around a simple design principle:

> Recognition is the reward.

Instead of solving puzzles for points or timers, players solve puzzles to reveal objects, animals, symbols, and other silhouettes hidden within the board.

Every level asks two questions:

1. Can you solve the puzzle?
2. What shape are you uncovering?

---

## Gameplay

Each arrow can only leave the board in the direction it points.

If an arrow is blocked by another arrow or an obstacle, the path must be cleared first.

The objective is simple:

* Remove every arrow.
* Reveal the hidden silhouette.
* Move on to the next discovery.

While the rules remain simple throughout the game, the puzzle structures become increasingly intricate and require deeper planning.

---

## Core Features

### Silhouette Discovery

Every completed level reveals a hidden shape.

The silhouette itself becomes part of the progression system, encouraging players to continue discovering new objects and expanding their collection.

### Logic-Driven Gameplay

Difficulty comes from puzzle structure and move ordering rather than hidden mechanics or time pressure.

### Mobile-First Design

Built specifically for quick play sessions on both desktop and mobile devices.

### Progressive Difficulty

Levels gradually introduce more complex dependencies, longer solution chains, and increasingly demanding decision-making.

### Unlockable Customization

Players can unlock cosmetic rewards including arrow styles, trails, and visual themes.

---

## Design Philosophy

Arrow Escape is intentionally minimal.

The game avoids:

* Time limits
* Reflex-based gameplay
* Complex controls
* Excessive visual noise

Instead, the focus remains on three things:

* Clarity
* Puzzle satisfaction
* Shape recognition

The ideal player experience is:

Unknown Shape
→ Solve Puzzle
→ Reveal Shape
→ Recognition
→ One More Level

---

## Technology

Arrow Escape is built entirely with web technologies.

### Stack

* HTML5
* CSS3
* Vanilla JavaScript
* SVG Rendering

No external game engine is used.

---

## Project Structure

```text
Arrow_Escape/
├── assets/
├── css/
├── js/
├── mesh/
├── levels/
├── docs/
└── index.html
```

---

## Development Roadmap

### Current Focus (V0.3)

* Visual polish
* Shape collection system
* Store improvements
* Mobile optimization
* Performance improvements
* Progression systems

### Future Plans

* Advanced level generation tools
* Automated shape pipelines
* Expanded shape library
* Infinite content systems
* Enhanced customization options

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/<username>/arrow-escape.git
cd arrow-escape
```

Start a local server:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

---

## Vision

Arrow Escape is an attempt to create a puzzle game where solving the puzzle is only half of the reward.

The other half is discovery.

Every completed board answers a question the player has been asking since the level began:

"What am I looking at?"

And that moment of recognition is what the game is built around.
