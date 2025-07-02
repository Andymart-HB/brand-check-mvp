# Brand Check MVP

This demo lets you upload a PDF and checks it against brand rules using a Netlify function and OpenAI.

## Setup

1. Install dependencies for the Netlify function:
   ```bash
   cd brands
   npm install
   ```
2. Set an `OPENAI_API_KEY` environment variable.

## Running locally

Use the Netlify CLI to serve the function and static files:

```bash
npx netlify dev
```

Then open `http://localhost:8888` and test the upload form.

## Project structure

- `index.html` – basic form for uploading PDFs
- `script.js` – sends the file to `/netlify/functions/analyze`
- `brands/netlify/functions/analyze.js` – serverless function that calls OpenAI
- `brands/hb.json` – example brand rule file

## Deployment

Deploy the repository to Netlify. Ensure the `OPENAI_API_KEY` environment variable is configured in your deployment settings.
