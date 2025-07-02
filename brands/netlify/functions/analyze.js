const multipart = require('parse-multipart');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

exports.handler = async (event) => {
  try {
    // 1) Parse the multipart body
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.Parse(
      Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'),
      boundary
    );
    const filePart = parts.find((p) => p.filename);
    const brandPart = parts.find((p) => p.name === 'brand');

    if (!filePart) {
      return { statusCode: 400, body: 'No file uploaded' };
    }

    const buffer = filePart.data;

    // 2) Extract the text
    const { text } = await pdfParse(buffer);

    // 3) Load the brand rules JSON
    const brand = brandPart ? brandPart.data.toString() : 'hb';
    const rulesPath = path.join(__dirname, '..', '..', `${brand}.json`);
    const { rules } = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

    // 4) Build the AI prompt
    const prompt = `You are a brand compliance expert. Here are the rules:
${rules.map((r) => `${r}`).join('\n')}
Check this text for any breaches and return JSON:
"""${text}"""`;

    // 5) Call OpenAI API
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });
    const resultText = completion.data.choices[0].message.content.trim();
    let json;
    try {
      json = JSON.parse(resultText);
    } catch (e) {
      json = { result: resultText };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
