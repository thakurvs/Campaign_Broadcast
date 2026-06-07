import "./globals.css";

export const metadata = {
  title: "Campaign Broadcast",
  description: "Campaign Broadcast Platform - Send bulk messages efficiently",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
