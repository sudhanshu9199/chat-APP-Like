exports.generateReplySuggestions = async (conversationHistory) => {
  const systemPrompt = `You are an AI chat assistant. Your job is to suggest three short, natural, and context-aware replies for the user to select.
    Rules:
    1. Replies MUST be under 6 words.
    2. DO NOT use emojis.
    3. Provide diverse options: exactly one positive, one negative, and one neutal/questioning.
    4. You MUST return a strict JSON array of strings and absolutely nothing else.
    Example: ["Yes, I agree.", "No, I don't think so.", "What do you mean?"]`;

  try {
    const API_URL = process.env.LLM_API_ENDPOINT;
    const API_KEY = process.env.LLM_API_KEY;

    if (!API_URL || !API_KEY) {
      throw new Error(
        "Missing LLM_API_ENDPOINT or LLM_API_KEY in environment variables.",
      );
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Change this if using a different Llama-3 provider
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Conversation history:\n${conversationHistory}\n\nGenerate 3 replies for 'Me'.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let rawText = data.choices[0].message.content;

    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(rawText);
  } catch (err) {
    console.error("AI Service Error:", error.message);
    throw error;
  }
};
