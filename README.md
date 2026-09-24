# Stafford Academy

**Learn to program one mission at a time. Free, open and with nothing in your way.**

Stafford Academy is a free, open-source learning platform that runs as a Chrome extension. It teaches programming through short, hands-on missions: you read a little theory, write real code, and get instant feedback, all inside your browser.

## Why it exists

Stafford Academy is a non-profit project. It was built so that students, and anyone who wants to learn to code, can start without obstacles:

- **Free, forever.** No payments, no subscriptions, no premium tier.
- **No account.** Open it and start learning. Your progress is saved on your own computer.
- **No installs.** Python runs directly in the browser, so it works on school and library computers too.
- **Private by design.** No tracking and no analytics. Your code and your progress never leave your computer.
- **Open source.** Anyone can read, use, share and improve the code under the MIT License.

It is made for anyone who wants to find their way in the world of technology, whether they are writing their first line of code or building their first robot.

## What's inside

**18 Python courses with 1,523 missions and about 480 hours of practice.** They go from your very first `print()` to robotics and artificial intelligence.

| Course | Level | Missions | Hours |
| --- | --- | ---: | ---: |
| Programming from Zero | Beginner | 91 | 26 |
| Python for Robotics | Beginner | 84 | 24 |
| Control Theory and PID | Intermediate | 84 | 24 |
| Kinematics and Dynamics | Advanced | 85 | 28 |
| Computer Vision for Robots | Intermediate | 87 | 26 |
| Path Planning and Navigation | Advanced | 84 | 26 |
| ROS 2, the Robot Nervous System | Advanced | 84 | 30 |
| Humanoid Robotics | Advanced | 84 | 34 |
| State Estimation and Sensor Fusion | Intermediate | 84 | 26 |
| SLAM, Mapping While Moving | Advanced | 84 | 30 |
| Manipulation and Grasping | Advanced | 84 | 30 |
| Embedded Linux for Robots | Intermediate | 84 | 26 |
| Power, Batteries and Charging | Beginner | 84 | 18 |
| Signals, Noise and Filtering | Intermediate | 84 | 24 |
| Machine Learning on Robot Data | Advanced | 84 | 30 |
| Reinforcement Learning for Control | Advanced | 84 | 26 |
| Aerial Robots | Advanced | 84 | 30 |
| Building a Simulator | Intermediate | 84 | 26 |

Every mission gives you:

- A short **briefing** with the theory you need and nothing more.
- A **code editor** where you write the answer.
- An **instant check**. Beginner missions run your Python for real and compare its output. The rest check that your code does what the task asks.
- A **hint** when you are stuck, and the full solution if you really need it.
- **XP and levels** that track how far you have come.

### Meet Zerack, your helper

Zerack is the little robot in the corner of every page. It welcomes you to each classroom and cheers when you pass a mission. When your code fails, it explains the error in plain words.

- **AI on your own computer.** In recent versions of Chrome, Zerack can answer free-form questions with Chrome's built-in AI (Gemini Nano). The model runs on the computer itself: it is free, needs no API key or account, and sends nothing over the internet.
- **Works offline too.** On computers that cannot run the built-in AI, Zerack still explains Python errors, gives the mission hint, restates the task and answers questions about core Python concepts.

## Getting started

Stafford Academy is coming to the **Chrome Web Store**. Until then, you can load it by hand in a minute:

1. Download this repository (**Code → Download ZIP**) and unzip it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** and choose the unzipped folder, the one that contains `manifest.json`.
5. Click the Stafford Academy icon in the toolbar to open the academy.

The first time you run Python it takes a few seconds to load. After that it is instant.

## Roadmap

Python is only the beginning. Coming next:

- **More programming languages**, such as JavaScript, C and C++, Java and more.
- **More artificial intelligence courses**, on top of the machine learning, reinforcement learning and computer vision courses already included.
- **Publication on the Chrome Web Store**, so installing takes one click.

## Project structure

```
manifest.json          Chrome extension manifest (Manifest V3)
background.js          Opens the academy when the toolbar button is clicked
index.html             Home page: one course per screen, with a live code preview
academy/
  course.html          Course page: chapters and missions
  lesson.html          Mission page: briefing, editor and checker
  common.js            Shared helpers: progress, course loading, star field, text rendering
  home.js              Home page scene and live code window
  course.js            Course page logic
  lesson.js            Mission page logic and the answer checker
  mascot.js            Zerack: welcome animations and the helper panel
  python-runner.js     Runs student code in a web worker with a time limit
  python-worker.js     The worker that hosts Pyodide
  academy.css          Styles for the course and mission pages
  mascot.css           Styles for Zerack
  courses/             catalog.json plus one JSON file per course
  fonts/               Space Grotesk
lib/pyodide/           Pyodide: Python compiled to WebAssembly
icons/                 Extension icons
```

Each course is a plain JSON file: `chapters → lessons`, and every lesson has a `theory`, a `task`, `starter` code, a `solution`, a `hint` and a `check`. To add or improve a mission, edit the JSON and reload the extension.

## Contributing

Contributions are welcome: new missions, fixes to existing ones, translations, new courses or improvements to the app itself. Open an issue to talk about an idea, or send a pull request.

## Credits

- [Pyodide](https://pyodide.org) runs Python in the browser (MPL-2.0).
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) by Florian Karsten (SIL Open Font License).

## License

Released under the [MIT License](LICENSE). Made by ZERACK.
