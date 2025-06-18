# MCP Demo - Web Frontend

A modern React chat application that connects to MCP (Model Context Protocol) servers running on AWS Lambda.

## Features

- **Real-time Chat**: WebSocket-based messaging with fallback to REST API
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Connection Management**: Automatic reconnection and error handling
- **Message History**: Loads previous chat messages on session start
- **Typing Indicators**: Visual feedback during AI processing

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **WebSocket API** for real-time communication

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see `../api/README.md`)

### Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment file:

   ```bash
   cp env.example .env
   ```

3. Update `.env` with your API URLs:

   ```env
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to S3/CloudFront.

## Project Structure

```
src/
├── components/          # React components
│   ├── ChatApp.tsx     # Main chat application
│   ├── ChatInput.tsx   # Message input component
│   ├── Header.tsx      # Application header
│   └── MessageBubble.tsx # Individual message display
├── hooks/              # Custom React hooks
│   └── useWebSocket.ts # WebSocket connection management
├── utils/              # Utility functions
│   └── cn.ts          # Tailwind class merging
├── App.tsx            # Main app component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## API Integration

The frontend connects to the backend API for:

- **Session Management**: Creating and managing chat sessions
- **Message History**: Loading previous messages
- **Real-time Messaging**: WebSocket for instant message delivery
- **Fallback Support**: REST API when WebSocket is unavailable

## Deployment

This application is designed to be deployed to AWS S3 and served via CloudFront as part of the complete MCP demo stack.

See the main demo README for deployment instructions.
