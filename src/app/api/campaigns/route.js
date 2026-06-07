import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import esClient, { CAMPAIGNS_INDEX, ensureIndex } from "@/lib/elasticsearch";
import { processMobileNumbers } from "@/lib/utils";

// GET /api/campaigns - List campaigns for current user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query;
    let params;

    // Admin sees all campaigns, User sees only their own
    if (session.user.role === "ADMIN") {
      query = `
        SELECT c.*, u.name as user_name,
          (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id) as recipient_count
        FROM campaigns c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT c.*,
          (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id) as recipient_count
        FROM campaigns c
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `;
      params = [session.user.id];
    }

    const [campaigns] = await pool.execute(query, params);

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, message, mobileNumbers } = await request.json();

    // Validation
    if (!name || !message || !mobileNumbers) {
      return NextResponse.json(
        { error: "Name, message, and mobile numbers are required" },
        { status: 400 }
      );
    }

    // Process and clean mobile numbers
    const { valid, invalid, totalInput, duplicatesRemoved } =
      processMobileNumbers(mobileNumbers);

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "No valid mobile numbers found" },
        { status: 400 }
      );
    }

    // Insert campaign into MySQL
    const [campaignResult] = await pool.execute(
      "INSERT INTO campaigns (name, message, status, user_id, created_at) VALUES (?, ?, ?, ?, NOW())",
      [name, message, "PROCESSING", session.user.id]
    );

    const campaignId = campaignResult.insertId;

    // Insert recipients in bulk
    if (valid.length > 0) {
      const values = valid.map((num) => [campaignId, num, "PENDING"]);
      const placeholders = values.map(() => "(?, ?, ?)").join(", ");
      const flatValues = values.flat();

      await pool.execute(
        `INSERT INTO campaign_recipients (campaign_id, mobile_number, status) VALUES ${placeholders}`,
        flatValues
      );
    }

    // Simulate sending: randomly mark recipients as SENT or FAILED
    const updatePromises = valid.map(async (num) => {
      const status = Math.random() > 0.1 ? "SENT" : "FAILED"; // 90% success rate
      await pool.execute(
        "UPDATE campaign_recipients SET status = ? WHERE campaign_id = ? AND mobile_number = ?",
        [status, campaignId, num]
      );
    });
    await Promise.all(updatePromises);

    // Check if all sent successfully to update campaign status
    const [failedCount] = await pool.execute(
      "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND status = 'FAILED'",
      [campaignId]
    );

    const finalStatus =
      failedCount[0].count === 0 ? "COMPLETED" : "COMPLETED_WITH_FAILURES";
    await pool.execute("UPDATE campaigns SET status = ? WHERE id = ?", [
      finalStatus,
      campaignId,
    ]);

    // Sync to Elasticsearch (dual write)
    try {
      await ensureIndex();
      await esClient.index({
        index: CAMPAIGNS_INDEX,
        id: String(campaignId),
        document: {
          id: campaignId,
          name: name,
          status: finalStatus,
          user_id: session.user.id,
          user_name: session.user.name,
          recipientCount: valid.length,
          created_at: new Date().toISOString(),
        },
      });
    } catch (esError) {
      console.error("Elasticsearch sync error:", esError);
      // Don't fail the request if ES sync fails - MySQL is the source of truth
    }

    return NextResponse.json(
      {
        message: "Campaign created successfully",
        campaignId,
        stats: {
          totalInput,
          duplicatesRemoved,
          validNumbers: valid.length,
          invalidNumbers: invalid.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
