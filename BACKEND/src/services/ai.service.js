const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.generateReplySuggestions = async (conversationHistory) => {
  const systemPrompt = `You are an AI chat assistant. Your job is to suggest three short, natural, and context-aware replies for the user to select.
    Rules:
    1. Replies MUST be under 6 words.
    2. DO NOT use emojis.
    3. Provide diverse options: exactly one positive, one negative, and one neutal/questioning.
    4. You MUST return a strict JSON array of strings and absolutely nothing else.
    Example: ["Yes, I agree.", "No, I don't think so.", "What do you mean?"]`;

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in environment variables.");
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Conversation history:\n${conversationHistory}\n\nGenerate 3 replies for 'Me'.`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
    });

    let rawText = chatCompletion.choices[0]?.message?.content || "[]";

    // Clean up potential markdown formatting the AI might inject around the JSON
    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(rawText);
  } catch (err) {
    console.error("Groq AI Service Error:", err.message);
    throw err;
  }
};
