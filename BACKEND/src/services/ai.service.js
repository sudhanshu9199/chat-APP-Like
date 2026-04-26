const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.generateReplySuggestions = async (conversationHistory) => {
  const systemPrompt = `You are an AI chat assistant generating quick reply suggestions for a user. Your job is to analyze the provided conversation history and suggest three short, natural, and highly relevant replies the user could send next.

Rules:
1. Replies MUST be under 6 words.
2. DO NOT use emojis.
3. Options MUST be distinct and fit the specific context/tone of the last message (e.g., an agreement, a follow-up question, an acknowledgment, or empathy). 
4. Never force a positive or negative reply if it is inappropriate for the context.
5. Output ONLY a strict JSON array of three strings. Do not include markdown formatting, code blocks, or any other text.

Example:
Input: "I just finished the report and sent it over."
Output: ["Got it, thanks!", "I'll review it soon.", "Did you include the charts?"]`;

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

exports.generateChatSummary = async (formattedHistory) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    if (!formattedHistory || formattedHistory.trim() === "") {
      return "No recent messages to summarize.";
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const modelsToTry = [
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
    ];

    const prompt = `Summarize the following chat log in 3 bullet points. Focus only on decisions made and pending questions. Do not introduce the summary.\n\nChat Log:\n${formattedHistory}`;

    let lastErrorMsg = "";

    // 2. The Waterfall execution
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.warn(`[Gemini Fallback] ${modelName} failed: ${error.message}`);
        lastErrorMsg = error.message;

        // 3. Only fallback if the error is related to demand/rate-limiting
        // If it's a 400 Bad Request (e.g., policy violation), falling back won't help.
        const isHighDemand =
          error.message.includes("503") || error.message.includes("429");

        if (!isHighDemand) {
          break; // Exit the loop early for non-demand errors
        }
        // If it IS high demand, the loop naturally continues to the next model
      }
    }

    // 4. If the loop finishes and all models failed due to high demand
    console.error(
      "All Gemini fallback models exhausted. Last error:",
      lastErrorMsg,
    );
    return "The AI servers are currently experiencing unusually high demand. Please wait a few moments and try again. ⏳";
  } catch (err) {
    console.error("Critical Gemini AI Error:", err.message);
    return "Summary system is temporarily offline. Please try again later.";
  }
};
