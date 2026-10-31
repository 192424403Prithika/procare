# PropCare NW — Render Deployment Guide

This guide walks you through deploying both the **FastAPI Backend** and the **Next.js Frontend** to [Render](https://render.com).

---

## 🌟 Method A: 1-Click Render Blueprint Deployment (Recommended)

Since the repository includes [`render.yaml`](./render.yaml), Render can automatically provision and interconnect both services in one step.

### Step 1: Push your latest code to GitHub
Make sure your changes are committed and pushed:
```bash
git add -A
git commit -m "Configure Render deployment blueprints and build compatibility"
git push origin main
```

### Step 2: Open Render Dashboard
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account and select your repository:
   `192424403Prithika/procare` (Branch: `main`).
4. Render will automatically detect [`render.yaml`](./render.yaml) and list two services to create:
   - **`propcare-backend`** (Web Service, Python 3.11)
   - **`propcare-frontend`** (Web Service, Node 20)

### Step 3: Provide Required Secret (MongoDB Atlas)
In the Blueprint configuration form, fill in the **`MONGODB_URI`** parameter:
- **`MONGODB_URI`**: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
*(If left empty or during offline testing, the backend will automatically run with the built-in resilient in-memory database store with sample seed data)*.

### Step 4: Click "Apply"
Render will build and deploy both services simultaneously:
1. `propcare-backend` installs dependencies, loads YOLO weights, connects to MongoDB, and binds to `$PORT`.
2. `propcare-frontend` compiles Next.js pages, proxies API routes to `propcare-backend`, and starts the production server.

---

## 🛠️ Method B: Manual Service Setup on Render

If you prefer to configure the services individually in the Render UI:

### Service 1: Backend (FastAPI Python)
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select your repository: `192424403Prithika/procare`.
3. Configure the following fields:
   - **Name**: `propcare-backend`
   - **Region**: Choose closest to you (e.g., `Oregon`, `Frankfurt`, or `Singapore`)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Pinned Python runtime |
   | `ENVIRONMENT` | `production` | Application mode |
   | `DEBUG` | `false` | Disable debug stack traces |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `MONGODB_DATABASE` | `propcare_nw` | Primary database name |
   | `JWT_SECRET_KEY` | *(Click "Generate")* | Cryptographic token signing secret |
   | `JWT_ALGORITHM` | `HS256` | Token algorithm |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24-hour token lifetime |
   | `STORAGE_PROVIDER` | `local` | Upload storage mode (`local` or `cloudinary`) |
   | `STORAGE_LOCAL_DIR` | `./uploads` | Uploaded images directory |
   | `STORAGE_SIGNING_SECRET` | *(Click "Generate")* | Signed URL secret |
   | `YOLO_MODEL_PATH` | `backend/models/moisture_best.pt` | Moisture YOLO weights |
   | `BREAKAGE_YOLO_MODEL_PATH` | `backend/models/breakage_best.pt` | Structural Breakage YOLO weights |
   | `YOLO_DEVICE` | `cpu` | Inference processor |
   | `BREAKAGE_YOLO_DEVICE` | `cpu` | Inference processor |
   | `CORS_ORIGINS` | `*` | Allowed CORS origins |
5. Click **Create Web Service**. Note the deployed backend URL (e.g., `https://propcare-backend.onrender.com`).

---

### Service 2: Frontend (Next.js TypeScript)
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select your repository: `192424403Prithika/procare`.
3. Configure the following fields:
   - **Name**: `propcare-frontend`
   - **Region**: Same region as backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_VERSION` | `20.18.0` | Node.js runtime |
   | `PORT` | `10000` | Port for Next.js server |
   | `NEXT_PUBLIC_API_URL` | `https://propcare-backend.onrender.com` | URL of your deployed Render backend |
5. Click **Create Web Service**.

---

## 🔒 Important MongoDB Atlas Network Access Note
If you are using MongoDB Atlas, make sure Render can connect to your database:
1. Open [cloud.mongodb.com](https://cloud.mongodb.com).
2. Go to **Network Access** &rarr; **IP Access List**.
3. Click **Add IP Address**.
4. Select **Allow Access From Anywhere** (`0.0.0.0/0`) or add Render's outbound IP ranges.
5. Click **Confirm**.

---

## ✅ Verifying Your Deployment
Once deployment succeeds:
1. **Backend Health**: Visit `https://propcare-backend.onrender.com/health` &rarr; should return:
   ```json
   {
     "status": "healthy",
     "database": { "status": "connected" },
     "environment": "production"
   }
   ```
2. **Backend API Docs**: Visit `https://propcare-backend.onrender.com/docs` to view the interactive OpenAPI documentation.
3. **Frontend Application**: Visit `https://propcare-frontend.onrender.com` to access the full PropCare NW application.
