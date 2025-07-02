const { IncomingForm } = require('formidable');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

exports.handler = async (event) => {
  // 1) Parse the form-data
  const { fields, files } = await new Promise((res, rej) => {
    new IncomingForm().parse(event, (err, f, fi) =>
      err ? rej(err) : res({ fields: f, files: fi })
    );
  });

  // 2) Read the PDF buffer
  const buffer = fs.readFileSync(files.file.path);

  // 3) Extract the text
  const { text } = await pdfParse(buffer);

  // 4) Load the brand rules JSON
  const brand = fields.brand || 'hb';
  const rulesPath = path.join(__dirname, '..', `${brand}.json`);
  const { rules } = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

  // 5) Build the AI prompt
  const prompt = `
You are a brand compliance expert. Here are the rules:
${rules.map(r => `${r}`).join('\n')}
Check this text for any breaches and return JSON:
"""${text}"""
`.trim();

  // 6) Call OpenAI API
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });
  const result = completion.data.choices[0].message.content.trim();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: result,
  };
};
