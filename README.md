# LLM Chess Arena

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.1-green.svg)

A web-based chess platform where Large Language Models (LLMs) compete against each other or human players using LLM APIs. Watch AI models reason about and play chess in real-time with detailed move analysis.

---

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the proxy and web server**
   ```bash
   node server.js
   ```
   Open [http://localhost:3000/index.html](http://localhost:3000/index.html) in your browser.
3. **Configure players**
   - Select player type (human or AI)
   - Choose provider and model for each player
   - If the provider requires an API key, enter it and click "Save API Key"
   - For Ollama, no API key is needed
   - Click "Save Model Selection" to persist your configuration
4. **Play!**
   - Click "Start New Game" to begin
   - "Make Move" executes the next AI move
   - Enable "Auto Play" for automatic matches

   ![Screenshot of LLM Chess Arena](https://i.ibb.co/Y2vvB8T/image.png)

---

## 🧩 Current Features & Improvements

- **Express Proxy (`server.js`)**: The frontend never talks directly to Ollama, avoiding CORS issues. All local model requests go through `http://localhost:3000/ollama/...`.
- **Dynamic model selection**: Ollama models are scanned in real time and only appear in the dropdown if installed.
- **"Save Model Selection" button**: Persists your current configuration and shows visual confirmation.
- **No API key required for Ollama**: The field is hidden and does not block the game if you use local models.
- **Centralized configuration in `models-config.js`**: Easily add, remove, or modify models and providers.
- **Robust UI**: Dropdowns and controls update dynamically based on provider/model selection.
- **Multi-provider support**: Groq, OpenAI, Gemini, xAI Grok, OpenRouter, and Ollama (local).

---

## 🛠️ Key Files

- `index.html`: Main interface and game controls.
- `chess-game.js`: Game logic, model integration, UI and API key management.
- `models-config.js`: Provider and model configuration.
- `server.js`: Express server + proxy for Ollama.

---

## 📝 Example Model Configuration

Edit `models-config.js` to customize available models:

```js
'openrouter': {
    displayName: 'OpenRouter',
    models: {
        'anthropic/claude-3-opus:beta': {
            displayName: 'Claude 3 Opus',
            tempRange: { min: 0.1, max: 1.0 }
        },
        // ...other models
    }
}
```

For Ollama, models are detected automatically based on those installed on your system.

---

## 🧑‍💻 Development & Testing

- You can open the project directly in your browser using the Express proxy.
- The system saves configuration and API keys in LocalStorage.
- The "Save Model Selection" button allows you to persist your setup between sessions.

---

## 🏁 Final Notes

- If you have CORS issues, always use the proxy (`server.js`).
- If Ollama models do not appear, make sure Ollama is running and has models installed.
- For any provider, ensure you have the correct API key if required.

---

Enjoy pitting LLMs against each other on the chessboard! If you have questions or want to improve the project, open an issue or PR.

---

## 📚 Credits & Licenses

This project uses [chessboard.js] some of the code is included in the folder libs  (https://github.com/oakmac/chessboardjs/) by Chris Oakman.

Copyright 2019 Chris Oakman

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
