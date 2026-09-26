# Privacy Policy

**Stafford Academy** is a free, non-profit, open-source Chrome extension for learning programming, AI, electronics and robotics. This policy explains what happens to your data when you use it.

*Last updated: September 26, 2026*

## The short version

- Stafford Academy has **no accounts, no tracking, no analytics and no ads**.
- Your progress, your code and your settings stay **on your own computer**.
- We, the makers of Stafford Academy, **never receive any of your data**. We do not run any server.
- The only time anything leaves your computer is if **you choose to connect Zerack to Google's Gemini AI** with your own API key. Then your question and the current mission, including your code, are sent to Google to get an answer.

## What is stored on your computer

Stafford Academy saves the following in your browser's local storage (`chrome.storage.local`, `localStorage` and `sessionStorage`). It never leaves your computer and is not sent to us or to anyone else:

| Data | Why |
| --- | --- |
| Your progress: completed missions, XP and the last mission you opened | So you can continue where you left off |
| Drafts of the code or answers you write in a mission | So you do not lose your work if you close the tab |
| Settings, such as your Gemini API key and the chosen AI model, if you connect one | So Zerack can use the AI you connected |
| Your recent conversation with Zerack, for the current browser session only | So the chat stays visible while you move between pages |

You can delete all of it at any time by removing the extension from `chrome://extensions`. To delete only a saved API key, open Zerack's **Connect AI** settings and remove it.

## What is processed on your computer

- **Python code** runs inside your browser with Pyodide, which is bundled with the extension. Your code is not uploaded anywhere.
- **Chrome's built-in AI (Gemini Nano)**, when your computer supports it, runs on the device itself. Chrome may download the model the first time, but your questions are answered locally.
- All fonts, images, courses and code are bundled with the extension. It does not load anything from the internet on its own.

## What is sent to Google, and only if you choose to

Zerack can answer any question if you press **Connect AI** and paste a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). This is optional and off by default.

When it is connected and you ask Zerack a question, Stafford Academy sends to Google's Gemini API (`generativelanguage.googleapis.com`):

- your question and the last few messages of your chat with Zerack,
- the course and mission you are on: its title, task and hint, what you have written in the editor, and what the checker answered, so the answer fits what you are doing,
- your API key, to authenticate the request and to list the available models when you connect it.

This data goes directly from your browser to Google. It does not pass through any server of ours. Google handles it under the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) and the [Google Privacy Policy](https://policies.google.com/privacy). To stop, remove your key in Zerack's **Connect AI** settings.

## What we do not do

- We do not collect, sell, share or transfer your personal data.
- We do not use your data for advertising, credit decisions or any purpose unrelated to teaching.
- We do not track which websites you visit. The extension only runs on its own pages.

## Children and schools

Stafford Academy is made for students, including students at school. Because it collects no personal data, students can use it without an account. Google only issues Gemini API keys to adults, so if a school wants to use the optional online AI, a teacher or parent sets up the key.

## Changes

If this policy changes, the new version will be published at this same address, and its history is visible in the repository.

## Contact

Questions about privacy? Open an issue at [github.com/itzjk/stafford-academy/issues](https://github.com/itzjk/stafford-academy/issues).
