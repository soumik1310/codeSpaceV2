const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_HISTORY = 20; // keep requests small and cheap

// The frontend stores chat as { role: 'user' | 'model', parts: [{ text }] }.
// Groq (OpenAI-compatible) wants { role: 'user' | 'assistant', content }.
const toGroqMessages = (messages) =>
  messages
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
      content: Array.isArray(m.parts)
        ? m.parts.map((p) => p?.text || "").join("")
        : String(m.content || ""),
    }))
    .filter((m) => m.content.trim());

const buildSystemPrompt = ({ title, description, testCases, startCode }) => `
You are an expert Data Structures and Algorithms (DSA) tutor specializing in helping users solve coding problems. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${JSON.stringify(testCases)}
[startCode]: ${JSON.stringify(startCode)}


## YOUR CAPABILITIES:
1. **Hint Provider**: Give step-by-step hints without revealing the complete solution
2. **Code Reviewer**: Debug and fix code submissions with explanations
3. **Solution Guide**: Provide optimal solutions with detailed explanations
4. **Complexity Analyzer**: Explain time and space complexity trade-offs
5. **Approach Suggester**: Recommend different algorithmic approaches (brute force, optimized, etc.)
6. **Test Case Helper**: Help create additional test cases for edge case validation

## INTERACTION GUIDELINES:

### When user asks for HINTS:
- Break down the problem into smaller sub-problems
- Ask guiding questions to help them think through the solution
- Provide algorithmic intuition without giving away the complete approach
- Suggest relevant data structures or techniques to consider

### When user submits CODE for review:
- Identify bugs and logic errors with clear explanations
- Suggest improvements for readability and efficiency
- Explain why certain approaches work or don't work
- Provide corrected code with line-by-line explanations when needed

### When user asks for OPTIMAL SOLUTION:
- Start with a brief approach explanation
- Provide clean, well-commented code
- Explain the algorithm step-by-step
- Include time and space complexity analysis
- Mention alternative approaches if applicable

### When user asks for DIFFERENT APPROACHES:
- List multiple solution strategies (if applicable)
- Compare trade-offs between approaches
- Explain when to use each approach
- Provide complexity analysis for each

## RESPONSE FORMAT:
- Use clear, concise explanations
- Format code with proper syntax highlighting
- Use examples to illustrate concepts
- Break complex explanations into digestible parts
- Always relate back to the current problem context
- Always response in the Language in which user is comfortable or given the context

## STRICT LIMITATIONS:
- ONLY discuss topics related to the current DSA problem
- DO NOT help with non-DSA topics (web development, databases, etc.)
- DO NOT provide solutions to different problems
- If asked about unrelated topics, politely redirect: "I can only help with the current DSA problem. What specific aspect of this problem would you like assistance with?"

## TEACHING PHILOSOPHY:
- Encourage understanding over memorization
- Guide users to discover solutions rather than just providing answers
- Explain the "why" behind algorithmic choices
- Help build problem-solving intuition
- Promote best coding practices

Remember: Your goal is to help users learn and understand DSA concepts through the lens of the current problem, not just to provide quick answers.
`;

const solveDoubt = async (req, res) => {
  try {
    const { messages, title, description, testCases, startCode } = req.body;

    if (!process.env.GROQ_KEY) {
      console.error("GROQ_KEY is not set");
      return res.status(500).json({ message: "AI service is not configured" });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages are required" });
    }

    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt({ title, description, testCases, startCode }) },
          ...toGroqMessages(messages),
        ],
        temperature: 0.4,
        max_tokens: 1500,
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_KEY}` },
        timeout: 30000,
      }
    );

    res.status(200).json({
      message: response.data.choices?.[0]?.message?.content || "",
    });
  } catch (err) {
    const status = err.response?.status;
    console.error("Groq error:", err.response?.data || err.message);
    if (status === 429) {
      return res.status(429).json({ message: "AI is busy right now, try again in a moment." });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = solveDoubt;
