import { CognitoIdentityServiceProvider } from "aws-sdk";

const cognito = new CognitoIdentityServiceProvider();

export const handler = async (event: any): Promise<any> => {
  try {
    const userPoolId = process.env["USER_POOL_ID"];
    const demoUserEmail =
      process.env["DEMO_USER_EMAIL"] || "pablo.albaladejo.mestre+mcp@gmail.com";

    if (!userPoolId) {
      throw new Error("USER_POOL_ID environment variable is required");
    }

    const users = [
      {
        username: "demo_user",
        name: "Demo User",
        description: "Chat user - no admin access",
      },
      {
        username: "demo_admin",
        name: "Demo Admin",
        description: "Admin user - dashboard access only",
      },
    ];

    const createdUsers = [];

    for (const user of users) {
      try {
        // Check if user already exists
        try {
          await cognito
            .adminGetUser({
              UserPoolId: userPoolId,
              Username: user.username,
            })
            .promise();

          console.log(
            `User ${user.username} already exists, skipping creation`
          );
          createdUsers.push({ username: user.username, status: "exists" });
          continue;
        } catch (error: any) {
          if (error.code !== "UserNotFoundException") {
            throw error;
          }
        }

        // Generate a random password
        const password =
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).toUpperCase().slice(-4) +
          "1!";

        // Create the user
        const createUserParams = {
          UserPoolId: userPoolId,
          Username: user.username,
          UserAttributes: [
            {
              Name: "email",
              Value: demoUserEmail,
            },
            {
              Name: "email_verified",
              Value: "true",
            },
            {
              Name: "name",
              Value: user.name,
            },
          ],
          MessageAction: "SUPPRESS", // Don't send welcome email
        };

        await cognito.adminCreateUser(createUserParams).promise();

        // Set the password
        const setPasswordParams = {
          UserPoolId: userPoolId,
          Username: user.username,
          Password: password,
          Permanent: true,
        };

        await cognito.adminSetUserPassword(setPasswordParams).promise();

        createdUsers.push({
          username: user.username,
          password: password,
          status: "created",
          description: user.description,
        });

        console.log(`User ${user.username} created successfully`);
      } catch (userError) {
        console.error(`Error creating user ${user.username}:`, userError);
        createdUsers.push({
          username: user.username,
          status: "error",
          error:
            userError instanceof Error ? userError.message : "Unknown error",
        });
      }
    }

    // Send email with credentials for all created users
    const ses = new (require("aws-sdk").SES)();

    const emailBody = createdUsers
      .filter((user) => user.status === "created")
      .map((user) => `${user.username}: ${user.password} (${user.description})`)
      .join("\n");

    if (emailBody) {
      const emailParams = {
        Source: "noreply@yourdomain.com", // You'll need to verify this email in SES
        Destination: {
          ToAddresses: [demoUserEmail],
        },
        Message: {
          Subject: {
            Data: "MCP Demo - Users Created",
          },
          Body: {
            Text: {
              Data: `Your MCP Demo users have been created successfully!

${emailBody}

demo_user: Access to chat functionality only
demo_admin: Access to admin dashboard only

Please log in at the application URL and change your passwords.

Best regards,
MCP Demo Team`,
            },
            Html: {
              Data: `
                <html>
                  <body>
                    <h2>MCP Demo - Users Created</h2>
                    <p>Your MCP Demo users have been created successfully!</p>
                    <ul>
                      ${createdUsers
                        .filter((user) => user.status === "created")
                        .map(
                          (user) =>
                            `<li><strong>${user.username}:</strong> ${user.password} (${user.description})</li>`
                        )
                        .join("")}
                    </ul>
                    <p><strong>demo_user:</strong> Access to chat functionality only</p>
                    <p><strong>demo_admin:</strong> Access to admin dashboard only</p>
                    <p>Please log in at the application URL and change your passwords.</p>
                    <br>
                    <p>Best regards,<br>MCP Demo Team</p>
                  </body>
                </html>
              `,
            },
          },
        },
      };

      try {
        await ses.sendEmail(emailParams).promise();
        console.log("Email sent successfully");
      } catch (emailError) {
        console.warn(
          "Failed to send email, but users were created:",
          emailError
        );
        // Don't fail the function if email fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Users created successfully",
        users: createdUsers,
        email: demoUserEmail,
      }),
    };
  } catch (error) {
    console.error("Error creating users:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to create users",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  // Ensure at least one uppercase, one lowercase, and one digit
  password += chars.charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += chars.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
  password += chars.charAt(52 + Math.floor(Math.random() * 10)); // Digit

  // Fill the rest randomly
  for (let i = 3; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
