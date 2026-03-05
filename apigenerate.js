export default async function handler(req, res) {

  // ─────────────────────────────
  // CORS
  // ─────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─────────────────────────────
  // Request data
  // ─────────────────────────────
  const { vision, selections, model } = req.body || {};

  if (!vision) {
    return res.status(400).json({ error: 'Vision is required' });
  }

  // ─────────────────────────────
  // API KEYS
  // (Guardadas en variables de entorno)
  // ─────────────────────────────
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const LEONARDO_KEY = process.env.LEONARDO_API_KEY;
  const MESHY_KEY = process.env.MESHY_API_KEY;

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
  }

  try {

    // ─────────────────────────────
    // 1. CLAUDE – Creative Direction
    // ─────────────────────────────
    const claudeModel = model || "claude-3-opus-20240229";

    const prompt = `
You are the creative director of KIMERICA Studio, an elite luxury creative agency.

Client vision: "${vision}"

Config:
Objective: ${selections?.obj || 'Brand Authority'}
Visual: ${selections?.vis || 'Luxury Black'}
Budget: ${selections?.bud || '$20k+'}

Write a precise creative direction brief (3–4 paragraphs).

End ONLY with this JSON (no markdown):

{"sc1":"$X,XXX","sc2":"$X,XXX","sc3":"$X,XXX","sc4":"$X,XXX","time":"X–X weeks","total":"$XX,XXX"}
`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      throw new Error(`Claude API error: ${errorText}`);
    }

    const claudeData = await claudeRes.json();

    const fullText =
      claudeData?.content?.[0]?.text ||
      "";

    // ─────────────────────────────
    // Extraer JSON
    // ─────────────────────────────
    let scope = {};

    const jsonMatch = fullText.match(/\{[^{}]*\}/s);

    if (jsonMatch) {
      try {
        scope = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    const proposalText = fullText.replace(/\{[^{}]*\}/s, "").trim();


    // ─────────────────────────────
    // 2. LEONARDO AI – Moodboard
    // ─────────────────────────────
    let leonardoGenerationId = null;

    if (LEONARDO_KEY) {
      try {

        const leoRes = await fetch(
          "https://cloud.leonardo.ai/api/rest/v1/generations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LEONARDO_KEY}`
            },
            body: JSON.stringify({
              prompt: `Luxury brand visual: ${vision}. Dark editorial, cinematic lighting, minimal black background.`,
              modelId: "b24e16ff-06e3-43eb-8d33-4416c2d75876",
              width: 512,
              height: 512,
              num_images: 4,
              guidance_scale: 8
            })
          }
        );

        const leoData = await leoRes.json();

        if (leoData?.sdGenerationJob?.generationId) {
          leonardoGenerationId =
            leoData.sdGenerationJob.generationId;
        }

      } catch (err) {
        console.log("Leonardo skipped:", err.message);
      }
    }


    // ─────────────────────────────
    // 3. MESHY – 3D generation
    // ─────────────────────────────
    let meshyTaskId = null;

    if (MESHY_KEY) {
      try {

        const meshyRes = await fetch(
          "https://api.meshy.ai/v2/text-to-3d",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${MESHY_KEY}`
            },
            body: JSON.stringify({
              mode: "preview",
              prompt: `Luxury 3D brand object: ${vision.substring(0, 200)}`,
              art_style: "realistic",
              negative_prompt: "low quality"
            })
          }
        );

        const meshyData = await meshyRes.json();

        meshyTaskId = meshyData?.result || null;

      } catch (err) {
        console.log("Meshy skipped:", err.message);
      }
    }

    // ─────────────────────────────
    // RESPONSE
    // ─────────────────────────────
    return res.status(200).json({
      proposal: proposalText,
      scope,
      leonardoGenerationId,
      meshyTaskId,
      model: claudeModel
    });

  } catch (error) {

    console.error("API ERROR:", error);

    return res.status(500).json({
      error: "Generation failed",
      details: error.message
    });

  }
}