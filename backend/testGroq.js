require('dotenv').config();
const axios = require('axios');

(async () => {
  try {
    const r = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hi' }],
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_KEY}` } }
    );
    console.log('OK:', r.data.choices[0].message.content);
  } catch (e) {
    console.error('FAILED:', e.response?.data || e.message);
  }
})();
