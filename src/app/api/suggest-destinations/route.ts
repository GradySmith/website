import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";
import { getDestinationPhotos } from "@/lib/destination-photos";
import type {
  DestinationQuery,
  DestinationSuggestion,
  DestinationSuggestionBase,
} from "@/types";

const SUGGEST_DESTINATIONS_TOOL: Anthropic.Tool = {
  name: "suggest_destinations",
  description:
    "Return a curated list of travel destinations matching the traveler's stated preferences.",
  input_schema: {
    type: "object",
    properties: {
      destinations: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "City or region name" },
            country: { type: "string" },
            pronunciation: {
              type: "string",
              description:
                "A simple, accurate phonetic respelling of how to say the destination name " +
                "out loud, using plain English syllables with the stressed syllable in CAPS " +
                "(e.g. 'kee-OH-toh' for Kyoto, 'reh-YAHV-yeek' for Reykjavik) — not IPA. If the " +
                "name is already straightforward English, still give the syllable breakdown " +
                "(e.g. 'SIH-nga-por' for Singapore).",
            },
            summary: {
              type: "string",
              description:
                "2-3 complete, properly punctuated sentences selling this destination to the " +
                "traveler — vivid, sensory, magazine-travel-feature language (sights, tastes, " +
                "atmosphere) that makes them want to book it, while staying grounded in real, " +
                "specific detail rather than generic hype",
            },
            highlights: {
              type: "array",
              items: { type: "string" },
              description:
                "3-4 short, enticing activity/experience phrases written to sound irresistible, " +
                "e.g. 'sunset boat rides through hidden lagoons' or 'street food crawls through " +
                "night markets' rather than flat labels like 'boat rides' or 'street food'",
            },
            bestTimeToVisit: { type: "string" },
            estimatedBudgetPerPerson: {
              type: "string",
              description:
                "Rough total per-person budget range for the trip, in USD, e.g. '$1,200-1,800'",
            },
          },
          required: [
            "name",
            "country",
            "pronunciation",
            "summary",
            "highlights",
            "bestTimeToVisit",
            "estimatedBudgetPerPerson",
          ],
        },
      },
    },
    required: ["destinations"],
  },
};

function buildPrompt(query: DestinationQuery) {
  const interests = query.interests.length
    ? query.interests.join(", ")
    : "no particular interests specified";

  return [
    "Suggest 3-5 travel destinations for a trip with these preferences:",
    `- Interests: ${interests}`,
    `- Region: ${query.region}`,
    `- Travel style: ${query.travelStyle}`,
    `- Trip length: ${query.duration}`,
    `- Month: ${query.month}`,
    `- Budget level: ${query.budget}`,
    "",
    "Pick a real, varied mix of destinations that genuinely fit these " +
      "answers rather than generic top-10-list picks — draw from anywhere " +
      "in the world that fits, not just the most obvious tourist spots. " +
      "Write clean, properly punctuated English, but make it enticing — " +
      "write like a travel magazine feature, not a spec sheet. Sell the " +
      "traveler on why they should go, and make each activity/highlight " +
      "sound like something worth booking a flight for. Stay specific and " +
      "factually grounded; enticing doesn't mean vague. Call the " +
      "suggest_destinations tool with your answer.",
  ].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DestinationQuery>;

  const query: DestinationQuery = {
    interests: body.interests ?? [],
    region: body.region ?? "Anywhere",
    travelStyle: body.travelStyle ?? "Cultural",
    duration: body.duration ?? "1 week",
    month: body.month ?? "Any month",
    budget: body.budget ?? "Mid-range",
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY isn't set in .env.local yet. Add it, then restart npm run dev.",
      },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      // Bumped up from 1500 — under load Claude occasionally ran close to
      // the old cap and got cut off mid-JSON, which broke the tool call.
      max_tokens: 2048,
      tools: [SUGGEST_DESTINATIONS_TOOL],
      tool_choice: { type: "tool", name: "suggest_destinations" },
      messages: [{ role: "user", content: buildPrompt(query) }],
    });

    if (message.stop_reason === "max_tokens") {
      console.error("suggest-destinations: response was cut off at max_tokens");
      return NextResponse.json(
        { error: "Claude's response got cut off generating suggestions. Try again." },
        { status: 502 }
      );
    }

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === "suggest_destinations"
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "Claude didn't return structured suggestions. Try again." },
        { status: 502 }
      );
    }

    // Defensive: guided tool-call generation should always match the
    // schema, but validate the shape rather than trusting it blindly —
    // an unhandled crash here is worse than a clear error message.
    const rawInput = toolUse.input as { destinations?: unknown };
    if (!Array.isArray(rawInput.destinations)) {
      console.error(
        "suggest-destinations: unexpected tool input shape:",
        JSON.stringify(toolUse.input)
      );
      return NextResponse.json(
        { error: "Claude returned suggestions in an unexpected format. Try again." },
        { status: 502 }
      );
    }

    const destinations = rawInput.destinations as DestinationSuggestionBase[];

    const supabase = await createClient();

    // Look up photos for all destinations in parallel rather than one at a time.
    const destinationsWithPhotos: DestinationSuggestion[] = await Promise.all(
      destinations.map(async (destination) => ({
        ...destination,
        photos: await getDestinationPhotos(supabase, destination.name, destination.country),
      }))
    );

    return NextResponse.json({ query, destinations: destinationsWithPhotos });
  } catch (error) {
    console.error("suggest-destinations error:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong generating suggestions. Check the terminal running npm run dev for details.",
      },
      { status: 500 }
    );
  }
}
