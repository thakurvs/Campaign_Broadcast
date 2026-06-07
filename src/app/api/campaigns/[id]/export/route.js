import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/campaigns/[id]/export - Export campaign data as Excel
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get campaign
    const [campaigns] = await pool.execute(
      "SELECT * FROM campaigns WHERE id = ?",
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
      "SELECT mobile_number, status FROM campaign_recipients WHERE campaign_id = ?",
      [id]
    );

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Campaign summary sheet
    const summaryData = [
      { Field: "Campaign Name", Value: campaign.name },
      { Field: "Message", Value: campaign.message },
      { Field: "Status", Value: campaign.status },
      { Field: "Created At", Value: campaign.created_at },
      { Field: "Total Recipients", Value: recipients.length },
      {
        Field: "Sent",
        Value: recipients.filter((r) => r.status === "SENT").length,
      },
      {
        Field: "Failed",
        Value: recipients.filter((r) => r.status === "FAILED").length,
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Recipients sheet
    const recipientData = recipients.map((r, index) => ({
      "S.No": index + 1,
      "Mobile Number": r.mobile_number,
      Status: r.status,
    }));
    const recipientSheet = XLSX.utils.json_to_sheet(recipientData);
    XLSX.utils.book_append_sheet(workbook, recipientSheet, "Recipients");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="campaign_${id}_report.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
