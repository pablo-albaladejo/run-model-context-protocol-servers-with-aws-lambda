import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import React from "react";

// Configure Amplify
const amplifyConfig = {
  Auth: {
    region: import.meta.env.VITE_AWS_REGION || "us-east-1",
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
  },
};

Amplify.configure(amplifyConfig);

interface LoginProps {
  onAuthStateChange: (isAuthenticated: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthStateChange }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            MCP Demo Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the AI chat application
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Authenticator
            onStateChange={(authState) => {
              if (authState === "signedIn") {
                onAuthStateChange(true);
              } else {
                onAuthStateChange(false);
              }
            }}
            components={{
              Header() {
                return (
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Welcome to MCP Demo
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Use your credentials to sign in
                    </p>
                  </div>
                );
              },
            }}
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Demo credentials: demo_user / (check your email for password)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
