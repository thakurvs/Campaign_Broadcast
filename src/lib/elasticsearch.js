import { Client } from "@elastic/elasticsearch";

// Create Elasticsearch client connected to local instance
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

// Index name we use for campaigns
export const CAMPAIGNS_INDEX = "campaigns";

// Create the campaigns index if it doesn't exist
export async function ensureIndex() {
  const exists = await esClient.indices.exists({ index: CAMPAIGNS_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: CAMPAIGNS_INDEX,
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            name: { type: "text" },
            status: { type: "keyword" },
            user_id: { type: "integer" },
            user_name: { type: "text" },
            recipientCount: { type: "integer" },
            created_at: { type: "date" },
          },
        },
      },
    });
  }
}

export default esClient;
