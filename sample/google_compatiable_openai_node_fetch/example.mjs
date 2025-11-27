/**
 * Example usage of the Gemini OpenAI-compatible client
 */

import {
  createGeminiClient,
  chatCompletion,
  listModels,
  createEmbedding,
} from "./gemini-openai-client.mjs";

async function main() {
  // Create client with optional configuration
  const client = createGeminiClient({
    // apiKey: "your-api-key",  // Or set GEMINI_API_KEY env var
    // proxy: "http://my.proxy.example.com:8080",
    // customHeaders: { "X-Custom-Header": "value" },
  });

  // Chat completion example
  console.log("=== Chat Completion ===");
  const response = await chatCompletion(client, {
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Explain to me how AI works in 2 sentences." },
    ],
    model: "gemini-2.0-flash",
    // temperature: 0.7,
    // maxTokens: 1000,
  });

  console.log("Response:", response.choices[0].message.content);
  console.log("Usage:", response.usage);

  // List models example
  console.log("\n=== Available Models ===");
  try {
    const models = await listModels(client);
    console.log("Models:", models.data?.map((m) => m.id).join(", "));
  } catch (error) {
    console.log("List models not available:", error.message);
  }

  // Embeddings example
  console.log("\n=== Embeddings ===");
  try {
    const embeddings = await createEmbedding(client, {
      input: "Hello, world!",
      model: "text-embedding-004",
    });
    console.log("Embedding dimensions:", embeddings.data[0].embedding.length);
  } catch (error) {
    console.log("Embeddings not available:", error.message);
  }
}

main().catch(console.error);
