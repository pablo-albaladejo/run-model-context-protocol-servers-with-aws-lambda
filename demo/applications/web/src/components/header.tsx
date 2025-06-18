import { Auth } from "aws-amplify";
import { Bot, LogOut, Settings, User, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await Auth.signOut();
      onSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isDemoUser = user?.username === "demo_user";
  const isDemoAdmin = user?.username === "demo_admin";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">MCP Demo</h1>
                <p className="text-sm text-gray-600">
                  AI Chat with Model Context Protocol
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation - Show different options based on user */}
            <nav className="flex items-center space-x-4">
              {isDemoUser && (
                <Link
                  to="/"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === "/"
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              )}

              {isDemoAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === "/admin"
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </nav>

            {/* User info */}
            {user && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.username}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {isDemoUser ? "Chat User" : isDemoAdmin ? "Admin" : "User"}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Zap className="h-4 w-4" />
              <span>Powered by AWS Lambda</span>
            </div>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
