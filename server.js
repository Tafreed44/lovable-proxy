require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (needed for extension to call the proxy)
app.use(cors());
app.use(express.json());

// Initialize OpenAI with your API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/chat', async (req, res) => {
  const { message, projectId, files, ...rest } = req.body;

  console.log(`📩 New chat request for project ${projectId}:`, message);

  // Build a system prompt that mimics Lovable's assistant style
  const systemPrompt = `You are an AI assistant for Lovable.dev, a platform for building web applications. Provide concise, working code and explanations. Always respond in a helpful manner.`;

  try {
    // Call OpenAI's streaming API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // or 'gpt-3.5-turbo' for lower cost
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: true,       // Enable streaming
      max_tokens: 1500,
    });

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the response in a format Lovable's UI understands
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Lovable expects JSON objects with a 'type' field
        const data = JSON.stringify({
          type: 'text',
          content: content
        });
        res.write(`data: ${data}\n\n`);
      }
    }

    // Send final event to indicate completion
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
});
