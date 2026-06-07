import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

// GET /api/campaigns/[id] - Get campaign details with recipients
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get campaign
    const [campaigns] = await pool.execute(
      `SELECT c.*, u.name as user_name 
       FROM campaigns c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [id]
    );

    if (campaigns.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaign = campaigns[0];

    // Only allow access if admin or campaign owner
    if (session.user.role !== "ADMIN" && campaign.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get recipients
    const [recipients] = await pool.execute(
      "SELECT * FROM campaign_recipients WHERE campaign_id = ?",
      [id]
    );

    // Get stats
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
       FROM campaign_recipients WHERE campaign_id = ?`,
      [id]
    );

    return NextResponse.json({
      campaign,
      recipients,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
