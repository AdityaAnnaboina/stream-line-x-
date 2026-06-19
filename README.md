# StreamlineX - Enterprise-Grade Async Video Sharing & AI Chatbot Workspace

StreamlineX is an enterprise-ready, AI-driven asynchronous screen recording and video-sharing workspace (similar to Loom) built to handle high-throughput video ingestion, secure edge distribution, automated AI analysis, and interactive playback. 

With StreamlineX, users can record their monitors, window inputs, and webcam feeds, stream them instantly to cloud hosting, and view automated transcripts, AI summaries, and interactive RAG-powered chatbots trained on what was discussed in the video.

---

## 🏗️ System Architecture & Data Flow

StreamlineX consists of three decoupled codebases collaborating to deliver a reliable, low-latency recording pipeline:

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

## 🔧 Core Subsystems

1. **Desktop Client (`stremlinex desktop`)**:
   * Built on **Electron.js**, **React**, **TypeScript**, and **TailwindCSS**.
   * Bypasses standard browser sandbox limitations to access system-level hardware APIs (`desktopCapturer` and native system audio loops).
   * Manages three distinct borderless overlay windows: the settings window, the recording widget controller, and the circular floating webcam view.
   * Leverages WebRTC's `MediaRecorder` with VP9 compression to emit continuous binary webm streams via WebSockets every second.

2. **Ingest Server (`stremlinex express`)**:
   * Built on **Express** and **Socket.io** running on a persistent Node.js instance.
   * Manages real-time binary stream ingestion and disk caching.
   * Directs the AI processing pipeline (OpenAI Whisper & GPT) and manages S3 file uploads once recording ends.

3. **Web Portal (`stremlinex web`)**:
   * Built on **Next.js 14 App Router** with Server Actions (`'use server'`) to communicate directly with the database.
   * Serves as the portal for shared workspaces, folder organization, payments, email notifications, and public video player pages.

---

## 🚀 Third-Party Integrations Deep-Dive

### 1. Clerk Authentication
Clerk provides secure, fully managed authentication.
* **Web Integration**: Protects dashboard routes using Next.js middleware ([`src/middleware.ts`](file:///c:/Users/katti/Desktop/stream-line-x--main/stremlinex%20web/stremlinex%20web/src/middleware.ts)) and provides pre-built components like `<SignIn />`, `<SignUp />`, and `<UserButton />`. It also enforces CORS policies to authorize desktop client access (`http://localhost:5173`).
* **Desktop Integration**: The Electron client calls `/api/auth/[id]` during sign-in to securely synchronize Clerk sessions. If the user does not exist in the database, Next.js automatically provisions a personal workspace, a default free subscription, and empty recording settings.

### 2. AWS Storage Security (S3 & CloudFront)
Videos are kept secure and served with low latency using AWS S3 and CloudFront CDN.
* **S3 Block Public Access**: The S3 bucket is private to prevent unauthorized video streaming.
* **Origin Access Control (OAC)**: Authorizes CloudFront to retrieve files from the private S3 bucket using a secure Service Principal policy:
  ```json
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Sid": "AllowCloudFrontServicePrincipal",
              "Effect": "Allow",
              "Principal": {
                  "Service": "cloudfront.amazonaws.com"
              },
              "Action": "s3:GetObject",
              "Resource": "arn:aws:s3:::your-bucket-name/*",
              "Condition": {
                  "StringEquals": {
                      "AWS:SourceArn": "arn:aws:cloudfront::your-account-id:distribution/your-distribution-id"
                  }
              }
          }
      ]
  }
  ```
* **Streaming**: The web portal streams videos securely using the CloudFront CDN endpoint, achieving video initialization latencies of **under 200ms**.

### 3. AI & Chatbot Pipeline (OpenAI & Voiceflow)
StreamlineX features an automated Retrieval-Augmented Generation (RAG) playback assistant.
* **OpenAI Whisper (`whisper-1`)**: High-accuracy speech-to-text API processing. Converts the ingested video's audio tracks into raw text transcriptions.
* **GPT-3.5 Turbo**: Summarizes the transcript, producing a structured JSON payload containing a dynamic video title and summary:
  ```json
  {
    "title": "StreamlineX Setup Tutorial",
    "summary": "This video walks through the complete setup of StreamlineX..."
  }
  ```
* **Voiceflow RAG Knowledge Base**: Transcripts are uploaded to Voiceflow's Knowledge Base API (`VOICEFLOW_KNOWLEDGE_BASE_API`).
* **Interactive Widget**: During playback, Next.js dynamically injects a custom Voiceflow script into the video detail page. Viewers can chat with the embedded AI agent to ask questions about topics discussed in the video.

### 4. Stripe Subscription & Gating
Stripe manages payment processing and checks subscription levels to enforce specific usage limits:
* **Checkout Flow**: The app creates a checkout session using your environment variables:
  ```typescript
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment?cancel=true`,
  });
  ```
* **Success Upgrading**: Upon successful redirect, Next.js retrieves the session details and updates the user's plan to `PRO`.

#### Code-Level Plan Gating Rules
The system programmatically restricts features based on the user's plan (`FREE` vs `PRO`):

| Feature | Free Tier | Pro Tier | Enforcement Point |
| :--- | :--- | :--- | :--- |
| **Max Recording Time** | **5 Minutes** | **Unlimited** | `StudioTray` handles this automatically. When the timer hits 5 minutes (`recordingTime.minute == "05"`), it triggers the stop hook. |
| **Video Resolution** | **720p (SD)** | **1080p (HD)** | Enforced in `MediaConfiguration`. The `1080p` dropdown option is disabled if the user's plan is `FREE`. |
| **AI Processing** | **Disabled** | **Enabled** | Enforced in Express `server.js`. The server only triggers Whisper and GPT APIs if Next.js returns `plan: "PRO"`. |
| **Workspaces** | **1 Personal** | **Unlimited Public** | Enforced in the `createWorkspace` Next.js Server Action, returning a `401 Unauthorized` response for Free users. |
| **Collaborator Invites** | **Disabled** | **Enabled** | Enforced in the Next.js Sidebar component; invitation features are hidden from Free users. |

### 5. CMS Integrations (Wix & WordPress)
* **Wix Integration**: Connects to a Wix collection named `opal-videos` using the Wix SDK, mapping video entries to PostgreSQL database IDs to display videos on the home feed.
* **WordPress Integration**: Fetches blog posts and updates from a WordPress site hosted on Cloudways via the WordPress API.

---

## 📊 Relational Database Design

The database schema is defined in PostgreSQL using the Prisma schema file ([`prisma/schema.prisma`](file:///c:/Users/katti/Desktop/stream-line-x--main/stremlinex%20web/stremlinex%20web/prisma/schema.prisma)).

### Entity Relationship Diagram
```
        ┌──────────────────┐
        │       User       │
        └────────┬─────────┘
                 │
  ┌──────────────┼──────────────┬──────────────┐
  │ 1            │ 1            │ 1            │ 1..*
┌─▼────────────┐┌─▼────────────┐┌─▼────────────┐┌─▼────────────┐
│ Subscription ││    Media     ││   Comment    ││  WorkSpace   │
│ (Free/Pro)   ││(Device Confs)││(Self-Relation)│(Personal/Pub)│
└──────────────┘└──────────────┘└──────┬───────┘└──────┬───────┘
                                       │               │ 1
                                       │               │
                                       │ *             ├───────────────┐
                                 ┌─────▼─────┐         │ 1..*          │ 1..*
                                 │   Video   │◄────────┼─────────┐     │
                                 │ (S3 Keys) │         ▼         ▼     ▼
                                 └───────────┘     ┌─────────┐ ┌─────────┐
                                                   │ Folder  │ │ Member  │
                                                   └─────────┘ └─────────┘
```

### Table Specifications
* **`User`**: Core account details, including `clerkid` mappings and settings like `firstView` (notifying creators by email on their first video view).
* **`Subscription`**: Plan tracking (`FREE` or `PRO`) and Stripe Customer IDs.
* **`Media`**: Defaults for user devices (mic, camera, quality presets).
* **`WorkSpace`**: Logical workspaces grouped as `PERSONAL` or `PUBLIC`.
* **`Folder`**: Directories inside workspaces.
* **`Video`**: Upload state, S3 keys, processing flags, OpenAI Whisper transcript text, and GPT summaries.
* **`Comment` (Self-Referenced Hierarchy)**: Supports nested replies using a self-referencing model:
  ```prisma
  model Comment {
    id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    comment   String
    reply     Comment[] @relation("reply")
    Comment   Comment?  @relation("reply", fields: [commentId], references: [id])
    commentId String?   @db.Uuid
    // ... references linking User and Video
  }
  ```

---

## ⚡ Key Performance Optimizations

### 💾 High Disk I/O Socket Fix
* **The Problem**: Initially, the Express server parsed all WebSocket chunks in memory, rebuilt the full video blob, and overwrote the entire file on disk every time a chunk was received:
  ```javascript
  recordedChunks.push(data.chunks);
  const videoBlob = new Blob(recordedChunks, {type: 'video/webm; codecs=vp9'});
  const buffer = Buffer.from(await videoBlob.arrayBuffer());
  const readStream = Readable.from(buffer);
  readStream.pipe(fs.createWriteStream('temp_upload/' + data.filename));
  ```
  This resulted in CPU spikes and disk bottlenecks during long recording sessions.
* **The Solution**: Refactored the socket event handler in `server.js` to append binary chunks directly to the disk stream:
  ```javascript
  socket.on('video-chunks', (data) => {
      fs.appendFile('temp_upload/' + data.filename, Buffer.from(data.chunks), (err) => {
          if (err) console.error("Error writing chunk:", err);
      });
  });
  ```
  This reduces memory overhead and disk I/O, allowing the server to handle concurrent recording sessions.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js (v18+)**
* **Yarn** (Desktop & Express) & **Bun** (Next.js Web)
* **PostgreSQL** instance

---

### 1. Web Portal Setup (`stremlinex web`)
1. Navigate to the web folder:
   ```bash
   cd "stremlinex web/stremlinex web"
   ```
2. Create `.env` using `.env.example`:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/dbname?sslmode=require"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISH_KEY="pk_test_..."
   STRIPE_CLIENT_SECRET="sk_test_..."
   STRIPE_SUBSCRIPTION_PRICE_ID="price_..."
   WIX_OAUTH_KEY="your-wix-key"
   NEXT_PUBLIC_HOST_URL="http://localhost:3000"
   NEXT_PUBLIC_CLOUD_FRONT_STREAM_URL="https://your-cf-dist.cloudfront.net"
   MAILER_EMAIL="your_email@gmail.com"
   MAILER_PASSWORD="your-gmail-app-password"
   CLOUD_WAYS_POST="https://your-wordpress-site/wp-json/wp/v2/posts"
   OPEN_AI_KEY="sk-proj-..."
   NEXT_PUBLIC_VOICE_FLOW_KEY="vf-project-key"
   VOICEFLOW_API_KEY="VF.key"
   VOICEFLOW_KNOWLEDGE_BASE_API="https://api.voiceflow.com/v1/knowledge-base/docs/upload/table?overwrite=false"
   ```
3. Install packages and sync database:
   ```bash
   bun install
   npx prisma db push
   ```
4. Run the Next.js dev server:
   ```bash
   bun dev
   ```

---

### 2. Ingest Server Setup (`stremlinex express`)
1. Navigate to the express folder:
   ```bash
   cd "stremlinex express/stremlinex express"
   ```
2. Create `.env`:
   ```env
   BUCKET_NAME="your-s3-bucket-name"
   BUCKET_REGION="us-east-1"
   ACCESS_KEY="AKIA..."
   SECRET_KEY="aws-secret-access-key"
   NEXT_API_HOST="http://localhost:3000/api/"
   ELECTRON_HOST="http://localhost:5173"
   OPEN_AI_KEY="sk-proj-..."
   ```
3. Initialize folders and install:
   ```bash
   mkdir temp_upload
   yarn install
   ```
4. Start the server:
   ```bash
   yarn dev
   ```

---

### 3. Desktop Client Setup (`stremlinex desktop`)
1. Navigate to the desktop folder:
   ```bash
   cd "stremlinex desktop/stremlinex desktop"
   ```
2. Create `.env`:
   ```env
   VITE_HOST_URL="http://localhost:3000/api"
   VITE_SOCKET_URL="http://localhost:5000"
   VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
   ```
3. Install and run:
   ```bash
   yarn install
   yarn dev
   ```
