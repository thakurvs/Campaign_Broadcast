// This script creates the required MySQL database and tables.
// Run it once before starting the application: npm run setup-db

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

async function setupDatabase() {
  console.log("🔧 Setting up Campaign Broadcast database...\n");

  // Connect without database first to create it
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  const dbName = process.env.DB_NAME || "campaign_broadcast";

  // Create database
  await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`✅ Database '${dbName}' created (or already exists)`);

  // Use the database
  await connection.execute(`USE \`${dbName}\``);

  // Create users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'USER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Table 'users' created");

  // Create campaigns table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING',
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("✅ Table 'campaigns' created");

  // Create campaign_recipients table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id INT PRIMARY KEY AUTO_INCREMENT,
      campaign_id INT NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);
  console.log("✅ Table 'campaign_recipients' created");

  console.log("\n🎉 Database setup complete!");
  console.log("\nTables created:");
  console.log("  - users (id, name, email, password, role)");
  console.log("  - campaigns (id, name, message, status, user_id, created_at)");
  console.log("  - campaign_recipients (id, campaign_id, mobile_number, status)");

  await connection.end();
}

setupDatabase().catch((error) => {
  console.error("❌ Database setup failed:", error.message);
  console.error("\nMake sure MySQL is running and your .env.local credentials are correct.");
  process.exit(1);
});
