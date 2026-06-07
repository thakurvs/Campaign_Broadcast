import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import esClient, { CAMPAIGNS_INDEX, ensureIndex } from "@/lib/elasticsearch";

// GET /api/search?q=searchterm&status=COMPLETED - Search campaigns via Elasticsearch
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use the search
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";

    await ensureIndex();

    // Build Elasticsearch query
    const must = [];

    if (query) {
      must.push({
        multi_match: {
          query: query,
          fields: ["name", "user_name"],
          fuzziness: "AUTO",
        },
      });
    }

    if (status) {
      must.push({
        term: { status: status },
      });
    }

    // If no filters, match all
    const esQuery =
      must.length > 0 ? { bool: { must } } : { match_all: {} };

    const result = await esClient.search({
      index: CAMPAIGNS_INDEX,
      body: {
        query: esQuery,
        sort: [{ created_at: { order: "desc" } }],
        size: 50,
      },
    });

    const campaigns = result.hits.hits.map((hit) => ({
      ...hit._source,
      _score: hit._score,
    }));

    return NextResponse.json({ campaigns, total: result.hits.total.value });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 }
    );
  }
}
