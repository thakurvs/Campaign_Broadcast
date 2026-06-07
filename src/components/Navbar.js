"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href={isAdmin ? "/admin" : "/dashboard"} className="text-xl font-bold text-blue-600">
              Campaign Broadcast
            </Link>
            <div className="flex gap-4">
              {isAdmin ? (
                <Link href="/admin" className="text-gray-700 hover:text-blue-600 font-medium">
                  Admin Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                    My Campaigns
                  </Link>
                  <Link href="/dashboard/campaigns/new" className="text-gray-700 hover:text-blue-600 font-medium">
                    New Campaign
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.name} ({session.user.role})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
