require('dotenv').config();
const express = require('express');
const { Groq } = require('groq-sdk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post('/chat', async (req, res) => {
  const { message, projectId } = req.body;
  console.log(`📩 Chat from ${projectId}:`, message);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an AI assistant for Lovable.dev.' },
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 1500,
    });

    res.setHeader('Content-Type', 'application/json'); // ← NOT text/event-stream
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream JSON objects one per line (no "data:" prefix)
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(JSON.stringify({ type: 'text', content }) + '\n');
      }
    }
    // Send final marker
    res.write(JSON.stringify({ type: 'done' }) + '\n');
    res.end();

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
