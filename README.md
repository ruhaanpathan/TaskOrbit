# TaskOrbit - Collaborative AI Notes Workspace

TaskOrbit is a modern, high-performance, full-stack note-taking workspace. It empowers users with a gorgeous rich-text editor, lightning-fast full-text search, and a suite of AI-driven productivity insights built directly into the workflow.

## Architecture & Technology Stack

- **Next.js 14/15 App Router**: Selected for its seamless server-side rendering, advanced routing capabilities, and robust Server Actions which allow us to perform direct, secure database mutations without writing a separate API layer.
- **PostgreSQL & Prisma**: The database layer uses a Neon PostgreSQL serverless database managed by the Prisma ORM. Prisma provides absolute type safety from the database schema straight to the React components.
- **Tiptap**: The core editor engine. Tiptap is a headless, deeply customizable rich-text editor based on ProseMirror, allowing us to build a completely custom UI (using Tailwind) without fighting default WYSIWYG styles.
- **Google Gemini API**: Integrated via `@google/genai` to automatically read user notes and instantly generate summaries, action items, and suggested titles formatted perfectly as JSON.
- **Auth.js (NextAuth v5)**: Secures the entire application with a credentials provider and bcrypt password hashing, utilizing `middleware.ts` to guard protected routes on the Edge.

## Keyboard Shortcuts

Designed for power users, TaskOrbit features seamless keyboard navigation:
- `Cmd/Ctrl + K` — Open the global search palette from anywhere
- `Cmd/Ctrl + S` — Manually trigger a note save
- `Cmd/Ctrl + Shift + I` — Instantly run the AI Insights generator on the current note

## Local Setup Instructions

Follow these steps to run the project locally on a clean machine:

**1. Clone the repository and install dependencies**
```bash
git clone https://github.com/yourusername/taskorbit.git
cd taskorbit
npm install
```

**2. Setup Environment Variables**
Copy the example environment file:
```bash
cp .env.example .env.local
```
Then, open `.env.local` and fill in your values.

**3. Configure Neon PostgreSQL**
- Go to [Neon.tech](https://neon.tech/) and create a free account.
- Create a new project and copy your PostgreSQL connection string.
- Paste it as your `DATABASE_URL` in `.env.local`.

**4. Configure Google Gemini API**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
- Create an API key.
- Paste it as your `GEMINI_API_KEY` in `.env.local`.

**5. Initialize the Database**
Run Prisma migrations to build your tables:
```bash
npx prisma migrate dev --name init
```

**6. Start the Development Server**
```bash
npm run dev
```
Visit `http://localhost:3000` to see the app!

## API Endpoints

While most mutations use Next.js Server Actions, the application utilizes the following REST APIs:

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/[...nextauth]` | No | Handles NextAuth login, registration, and session management. |
| `POST` | `/api/notes/[id]/generate-insights`| Yes | Sends note content to Gemini, returns parsed JSON insights, and logs to `AiLog`. Rate limited to 5 calls/hour. |
| `GET` | `/api/notes/search` | Yes | Executes native PostgreSQL `to_tsvector` full-text search and tag filtering. |

## Database Schema Diagram

```text
+----------------+       +-----------------+       +---------------+
|      User      |       |      Note       |       |      Tag      |
|----------------|       |-----------------|       |---------------|
| id (PK)        |1    M | id (PK)         |     1 | id (PK)       |
| name           |-------| title           |       | name          |
| email          |       | content         |       | userId (FK)   |
| passwordHash   |       | isArchived      |       +---------------+
| createdAt      |       | isPublic        |              | 1
+----------------+       | shareId         |              |
           |             | userId (FK)     |              |
           |             | createdAt       |              |
           |             | updatedAt       |              |
           |             +-----------------+              |
           |               | 1        | 1                 |
         M |               |          |                   |
  +---------------+        |          |                   |
  |     Tag       |--------+          | M                 | M
  +---------------+                 +-----------------+   |
                                    |    NoteTag      |---+
                                    |-----------------|
                                    | noteId (FK)     |
                                    | tagId (FK)      |
                                    +-----------------+

                                    +-----------------+
                                    |     AiLog       |
                                    |-----------------|
                                    | id (PK)         |
                                    | noteId (FK)     |
                                    | summary         |
                                    | actionItems     |
                                    | suggestedTitle  |
                                    +-----------------+
```

## Known Limitations & Future Improvements

- **In-Memory Rate Limiting**: The current rate limiter for the AI endpoint uses a simple JavaScript `Map`. In a production environment with multiple serverless edge functions, this should be replaced with Upstash Redis to ensure limits are tracked globally.
- **Authentication**: Currently uses standard Credentials. OAuth providers (Google, GitHub) could be added easily via Auth.js.
- **Collaborative Editing**: Tiptap supports Yjs for real-time multiplayer editing, which would be an excellent upgrade for public notes.
