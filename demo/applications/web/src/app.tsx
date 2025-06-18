import { Auth } from "aws-amplify";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import AdminDashboard from "./components/admin-dashboard";
import ChatApp from "./components/chat-app";
import Header from "./components/header";
import Login from "./components/login";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setIsAuthenticated(true);
      setCurrentUser(user);
    } catch (error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthStateChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    if (authenticated) {
      checkAuthState();
    } else {
      setCurrentUser(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await Auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onAuthStateChange={handleAuthStateChange} />;
  }

  const isDemoUser = currentUser?.username === "demo_user";
  const isDemoAdmin = currentUser?.username === "demo_admin";

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header onSignOut={handleSignOut} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* demo_user can only access chat */}
            {isDemoUser && (
              <>
                <Route path="/" element={<ChatApp />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* demo_admin can only access admin dashboard */}
            {isDemoAdmin && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            )}

            {/* Fallback for unknown users */}
            {!isDemoUser && !isDemoAdmin && (
              <Route
                path="*"
                element={
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Access Restricted
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Your user account doesn't have access to this application.
                    </p>
                    <p className="text-sm text-gray-500">
                      Please contact your administrator for access.
                    </p>
                  </div>
                }
              />
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
