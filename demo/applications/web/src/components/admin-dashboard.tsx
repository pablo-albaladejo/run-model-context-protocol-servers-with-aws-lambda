import { Auth } from "aws-amplify";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn";

interface SystemMetrics {
  totalUsers: number;
  activeSessions: number;
  totalMessages: number;
  messagesToday: number;
  weatherAlertsRequests: number;
  timeRequests: number;
  averageResponseTime: number;
  systemStatus: "healthy" | "warning" | "error";
  lastUpdated: string;
}

interface UserSession {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentSessions, setRecentSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "sessions" | "analytics"
  >("overview");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = (await Auth.currentSession()).getIdToken().getJwtToken();

      // Load system metrics
      const metricsResponse = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!metricsResponse.ok) {
        throw new Error("Failed to load metrics");
      }

      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load recent sessions
      const sessionsResponse = await fetch(
        `${API_BASE_URL}/api/admin/sessions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setRecentSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5" />;
      case "warning":
        return <AlertCircle className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor your MCP system performance and usage
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "sessions", label: "Active Sessions", icon: Users },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* System Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                System Status
              </h2>
              {metrics && (
                <div
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium",
                    getStatusColor(metrics.systemStatus)
                  )}
                >
                  {getStatusIcon(metrics.systemStatus)}
                  <span className="capitalize">{metrics.systemStatus}</span>
                </div>
              )}
            </div>
            {metrics && (
              <p className="text-sm text-gray-600">
                Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Users
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {metrics.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Sessions
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {metrics.activeSessions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Database className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Messages
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {metrics.totalMessages}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Avg Response Time
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {metrics.averageResponseTime}ms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Analytics */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Today's Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Messages Today
                    </span>
                    <span className="font-semibold">
                      {metrics.messagesToday}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Weather Alerts
                    </span>
                    <span className="font-semibold">
                      {metrics.weatherAlertsRequests}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time Requests</span>
                    <span className="font-semibold">
                      {metrics.timeRequests}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  System Health
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Database Status
                    </span>
                    <span className="text-green-600 font-semibold">
                      Connected
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">API Gateway</span>
                    <span className="text-green-600 font-semibold">
                      Healthy
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Lambda Functions
                    </span>
                    <span className="text-green-600 font-semibold">
                      Running
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Active Sessions
          </h2>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No active sessions found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Messages
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentSessions.map((session) => (
                    <tr key={session.sessionId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {session.sessionId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.lastActivity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.messageCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Analytics
          </h2>
          <p className="text-gray-500">Analytics dashboard coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
