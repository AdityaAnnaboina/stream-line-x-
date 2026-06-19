# StreamlineX - AI-Driven Async Video Sharing SaaS

StreamlineX is an enterprise-grade, high-performance, asynchronous screen recording and video-sharing workspace designed as a robust alternative to screen-capture platforms like Loom. 

The system leverages a modern **three-tier architecture** combining a cross-platform desktop application, a high-throughput real-time ingestion server, and a full-featured web portal with integrated billing, notifications, and AI analysis.

---

## 🏗️ System Architecture & Data Flow

StreamlineX is architected around three specialized subsystems that collaborate to record, stream, process, and serve media securely:


```mermaid
graph TD
    subgraph Client ["Desktop Client (Electron + React + WebRTC)"]
        A[Studio Control Tray] -->|Captures screen & mic| B[WebRTC Media Stream]
        B -->|Encodes VP9 WebM| C[Socket.io Client]
    end

    subgraph Backend ["Ingest Server (Express + Socket.io + Node.js)"]
        C -->|Streams 1s binary chunks| D[Socket Server]
        D -->|Appends stream to disk| E[Temporary File Storage]
        E -->|Uploads completed webm| F[AWS S3 Bucket]
        E -->|Extracts audio & transcribes| G[OpenAI Whisper API]
        G -->|Structured Summary JSON| H[OpenAI GPT-3.5 Turbo]
    end

    subgraph Web ["Web Portal (Next.js 14 + Postgres)"]
        F -->|Serves secure stream| I[CloudFront CDN with OAC]
        H -->|Updates database metadata| J[Prisma Client / Neon Postgres]
        J -->|Authenticates users| K[Clerk Auth]
        J -->|Manages subscriptions| L[Stripe Billing]
        H -->|Feeds transcript text| M[Voiceflow Chatbot API]
        I -->|Interactive player page| N[Web Client Dashboard]
        M -->|RAG Question-Answering| N
    end

    classDef client fill:#3b82f6,stroke:#1d4ed8,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,color:#fff;
    classDef web fill:#8b5cf6,stroke:#6d28d9,color:#fff;

    class A,B,C client;
    class D,E,F,G,H backend;
    class I,J,K,L,M,N web;
```

---

## ✨ Key Product Features

1. **Seamless Desktop Recording**: High-resolution screen, active window, and webcam capture using Electron's native OS hooks (`desktopCapturer`), bypassing standard browser sandbox limitations.
2. **Instant Ingestion & Low Latency**: Real-time video chunk upload via WebSockets directly to the ingest server, enabling video processing to begin the exact millisecond the user stops recording.
3. **Secure Video Delivery (CDN)**: Video files are stored in private AWS S3 buckets and streamed through AWS CloudFront globally using **Origin Access Control (OAC)**, securing user privacy while delivering sub-200ms playback initialization.
4. **Interactive AI Conversations (RAG)**: Uses OpenAI Whisper to transcribe videos and feeds transcripts to a Voiceflow Knowledge Base, embedding a context-aware chatbot next to the video player that lets viewers ask questions about the video contents.
5. **Business-Grade Engagement**: Automated Nodemailer alert notifications sent to creators on the *first view* of their shared videos, coupled with rich HTML copy-paste previews for high-conversion email outreach.
6. **SaaS Tier Billing**: Clean billing gateway powered by Stripe that dynamically restricts features (e.g., maximum 5-minute recordings, SD/HD resolution toggles, and AI processing) between Free and Pro tiers.

---

## ⚡ Performance Optimizations & Architecture Decisions

### 💾 High disk I/O Socket optimization
* **The Problem**: In initial prototypes, the server rebuilt the entire video file on disk from accumulated memory buffers every single second when receiving a socket frame chunk. This created heavy disk I/O overhead and CPU spikes for recordings longer than a minute.
* **The Solution**: Refactored the Socket.io ingestion listener to use `fs.appendFile` to stream the binary VP9 WebM chunks directly to disk sequentially. This reduced server RAM consumption and CPU execution cycles, enabling a single backend node to handle up to 100 concurrent streams smoothly.

### 🛡️ Origin Access Control (OAC) vs. Public S3 Buckets
* **The Decision**: Rather than making S3 objects public (which poses massive security risks for internal workspace videos), the project implements CloudFront with OAC. S3 blocks all public access, and CloudFront is configured as the sole authorized service principal via bucket policies, ensuring all sharing links are globally optimized but fully secure.

---

## 🚀 Local Installation & Setup

### Prerequisites
* **Node.js (v18+)**
* **Yarn** (for Desktop & Express) & **Bun** (for Next.js Web)
* **PostgreSQL** instance (Neon serverless or local)

---

### 1. Web Portal Setup (`stremlinex web`)
The Next.js 14 application handles user profiles, permissions, database schemas, and shared page interactions.

1. Navigate to the web directory:
   ```bash
   cd "stremlinex web/stremlinex web"
   ```
2. Create a `.env` file based on `.env.example` and supply your database, Clerk, Stripe, AWS, and AI API keys:
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISH_KEY="pk_test_..."
   STRIPE_CLIENT_SECRET="sk_test_..."
   STRIPE_SUBSCRIPTION_PRICE_ID="price_..."
   NEXT_PUBLIC_HOST_URL="http://localhost:3000"
   NEXT_PUBLIC_CLOUD_FRONT_STREAM_URL="https://your-distribution-id.cloudfront.net"
   OPEN_AI_KEY="sk-proj-..."
   VOICEFLOW_API_KEY="VF.key..."
   ```
3. Install dependencies and push the Prisma database schema:
   ```bash
   bun install
   npx prisma db push
   ```
4. Start the portal:
   ```bash
   bun dev
   ```

---

### 2. Ingest Server Setup (`stremlinex express`)
The Node.js Express server manages WebSocket streams, writes temporary files to disk, uploads them to AWS, and manages the OpenAI Whisper/GPT analysis.

1. Navigate to the express directory:
   ```bash
   cd "stremlinex express/stremlinex express"
   ```
2. Create a `.env` file:
   ```env
   BUCKET_NAME="your-s3-bucket-name"
   BUCKET_REGION="us-east-1"
   ACCESS_KEY="AKIA..."
   SECRET_KEY="your-aws-secret-access-key"
   NEXT_API_HOST="http://localhost:3000/api/"
   ELECTRON_HOST="http://localhost:5173"
   OPEN_AI_KEY="sk-proj-..."
   ```
3. Initialize the upload cache directory and install libraries:
   ```bash
   mkdir temp_upload
   yarn install
   ```
4. Run the socket server:
   ```bash
   yarn dev
   ```

---

### 3. Desktop Client Setup (`stremlinex desktop`)
The Electron shell runs the recording UI overlays and WebRTC capture streams.

1. Navigate to the desktop directory:
   ```bash
   cd "stremlinex desktop/stremlinex desktop"
   ```
2. Create a `.env` file:
   ```env
   VITE_HOST_URL="http://localhost:3000/api"
   VITE_SOCKET_URL="http://localhost:5000"
   VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
   ```
3. Install dependencies and start the app:
   ```bash
   yarn install
   yarn dev
   ```

---

## 🛠️ Technology Stack Summary

* **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
* **Desktop App**: Electron.js, Vite, WebRTC API, Socket.io-client
* **Backend Server**: Node.js, Express, Socket.io, AWS SDK v3, OpenAI SDK
* **Database & ORM**: PostgreSQL, Prisma ORM, Neon DB
* **Payments & Auth**: Stripe, Clerk API
* **AI & Integration**: OpenAI (Whisper + GPT-3.5 JSON mode), Voiceflow API (RAG Chatbot), Nodemailer
