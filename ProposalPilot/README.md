# ProposalPilot

ProposalPilot helps freelancers turn a client brief into a structured proposal using
Google Gemini. You can edit the draft, save it to a local SQLite database, reopen or
delete saved proposals, and download the current text as a Markdown file.

Stack: Python, Flask, SQLite, vanilla HTML/CSS/JavaScript, `google-genai`, `python-dotenv`.

## Run on Windows with VS Code

1. **Extract the ZIP.** Right-click `ProposalPilot.zip`, choose "Extract All", and extract it somewhere like `Documents`.
2. **Open the folder in VS Code.** File > Open Folder, then select the `ProposalPilot` folder. Open a terminal with Terminal > New Terminal (PowerShell is fine).
3. **Create and activate a virtual environment.**
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks the script, run this once and try again:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
   In Command Prompt, use `.venv\Scripts\activate.bat` instead.
4. **Install dependencies.**
   ```powershell
   pip install -r requirements.txt
   ```
5. **Create your `.env` file.**
   ```powershell
   copy .env.example .env
   ```
   Open `.env` and replace `your_api_key_here` with your own key from
   https://aistudio.google.com/apikey. Never share or commit `.env`.

   `GEMINI_MODEL` defaults to `gemini-3.8-flash`. If the app reports that the model
   was not found, replace it with a model available to your account.
6. **Run the app.**
   ```powershell
   python app.py
   ```
7. **Open** http://127.0.0.1:5000 in your browser. Stop the server with Ctrl+C.

## Project layout

```
ProposalPilot/
  app.py                  Flask app, validation, Gemini calls, JSON API
  database.py             SQLite access (parameterized queries)
  requirements.txt
  .env.example            Placeholders only; copy to .env
  .gitignore
  templates/index.html
  static/css/style.css
  static/js/app.js
```

The SQLite file `proposalpilot.db` is created automatically on first run.

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/` | Web interface |
| POST | `/api/generate` | Generate a proposal with Gemini |
| GET | `/api/proposals` | List recent saved proposals |
| POST | `/api/proposals` | Save a new proposal |
| GET | `/api/proposals/<id>` | Open a proposal |
| PUT | `/api/proposals/<id>` | Update a proposal |
| DELETE | `/api/proposals/<id>` | Delete a proposal |

## Notes

- The API key is read only on the server and is never sent to the browser.
- Generated proposals are drafts. Review every line, replace bracketed placeholders, and confirm all timeline estimates before sending anything to a client.
- Request bodies are limited to 256 KB.

## Troubleshooting

- "GEMINI_API_KEY is not set": check that `.env` exists in the project folder, then restart the app.
- "model was not found": change `GEMINI_MODEL` in `.env` and restart.
- "rate limit or quota": wait and retry, or check your quota in Google AI Studio.
