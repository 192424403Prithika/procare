# PropCare NW — Predictive Property Intelligence Backend

A production-grade Python FastAPI backend integrating MongoDB Atlas, OpenCV optical difference analysis, SciPy Fast Fourier Transform (FFT) acoustic leak signal processing, Open-Meteo psychrometric dew point calculations, and Awaab's Law statutory SLA triage.

---

## 1. Technology Stack

* **Framework**: Python 3.10+ / FastAPI 0.110+
* **Database**: MongoDB Atlas via Motor (AsyncIOMotorClient) & PyMongo
* **Data Validation**: Pydantic v2
* **Authentication**: JWT access & refresh tokens with Argon2id password hashing
* **Optical Engine**: OpenCV Headless & NumPy (specular reflection difference subtraction, SIFT alignment, JET false-colour heatmaps)
* **Acoustic Engine**: SciPy & SoundFile (Butterworth bandpass, rfft spectrum, Welch PSD)
* **Weather & Dew Point**: Open-Meteo API + Magnus-Tetens empirical psychrometric formulation
* **Reports**: ReportLab PDF Generation
* **Object Storage**: Private signed storage (local filesystem / Cloudinary adapter)

---

## 2. MongoDB Database Collections (17 Collections)

| # | Collection Name | Purpose | Primary Indexes |
|---|---|---|---|
| 1 | `users` | User accounts, credentials, and roles | `email` (unique), `role` |
| 2 | `organizations` | Housing trusts and provider entities | `slug` (unique) |
| 3 | `properties` | Housing assets, GPS coords, building specs | `postal_code`, `risk_level`, `organization_id` |
| 4 | `inspections` | Pathology reports and diagnostic observations | `property_id`, `inspector_id`, `status` |
| 5 | `inspection_images` | Photographic evidence metadata & storage paths | `inspection_id` |
| 6 | `inspection_audio` | Micro-acoustic recording metadata & paths | `inspection_id` |
| 7 | `image_analysis` | OpenCV optical difference metrics & heatmaps | `inspection_id`, `created_at` |
| 8 | `acoustic_analysis` | SciPy FFT frequency spectrum & anomaly scores | `inspection_id`, `created_at` |
| 9 | `weather_records` | Open-Meteo psychrometric telemetry cache | `property_id`, `fetched_at` |
| 10 | `risk_assessments` | Explainable multi-modal triage records & approvals | `property_id`, `inspection_id` |
| 11 | `contractors` | Verified contractor directory & accreditations | `user_id`, `verification_status`, `trade` |
| 12 | `contractor_applications`| Vetting submissions and certificates | `contractor_id` |
| 13 | `work_orders` | Statutory remediation orders & Awaab SLAs | `property_id`, `contractor_id`, `deadline_date` |
| 14 | `maintenance_records` | Audit of completed repairs & cost metrics | `property_id`, `work_order_id` |
| 15 | `reports` | Generated court-admissible PDF dossiers | `property_id`, `inspection_id` |
| 16 | `notifications` | Role-targeted and statutory SLA alerts | `user_id`, `is_read` |
| 17 | `audit_logs` | Immutable audit trail for administrative actions | `user_id`, `target_collection` |

---

## 3. Environment Configuration

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp .env.example .env
```

Key environment variables:
* `MONGODB_URI`: MongoDB Atlas connection URI (`mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`)
* `MONGODB_DATABASE`: Primary database name (default: `propcare_nw`)
* `JWT_SECRET_KEY`: Secret string for signing access and refresh tokens (min 32 characters)
* `ACCESS_TOKEN_EXPIRE_MINUTES`: Access token expiration (default: `60`)
* `REFRESH_TOKEN_EXPIRE_DAYS`: Refresh token lifetime (default: `7`)
* `STORAGE_PROVIDER`: `local` or `cloudinary`
* `OPEN_METEO_BASE_URL`: Open-Meteo forecast API base URL
* `FRONTEND_URL`: URL of the Next.js frontend (default: `http://localhost:3000`)

---

## 4. Setup & Running Locally

### Step 1: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Create the Initial Platform Administrator
Bootstrap the first administrator account securely without hardcoding credentials:
```bash
python scripts/create_admin.py --email admin@propcare-nw.com --password YourSecurePassword123! --name "Dr. Alexander Wright"
```

### Step 3: Seed Baseline Portfolio Records (Optional & Non-Destructive)
Seed baseline benchmark properties and verified contractors into MongoDB Atlas:
```bash
python scripts/seed_mongodb.py
```

### Step 4: Start the FastAPI Backend
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service will be accessible at:
* **API Base**: `http://localhost:8000`
* **Interactive Swagger UI**: `http://localhost:8000/docs`
* **Interactive ReDoc**: `http://localhost:8000/redoc`
* **Healthcheck**: `http://localhost:8000/health`

---

## 5. API Endpoints Overview

### Authentication & Users
* `POST /api/v1/auth/register`: Public registration (defaults to `manager`, never allows self-escalation)
* `POST /api/v1/auth/login`: Authenticate with Argon2, receive JWT access & refresh tokens
* `POST /api/v1/auth/refresh`: Rotate tokens
* `POST /api/v1/auth/logout`: Revoke active session
* `GET /api/v1/auth/me`: Current authenticated user profile
* `GET /api/v1/users`: List users (Admin only)
* `PUT /api/v1/users/{id}/role`: Assign role (Admin only, audited)

### Property Management
* `POST /api/v1/properties`: Create property (Manager, Admin)
* `GET /api/v1/properties`: List authorized properties with search, building type filter, and pagination
* `GET /api/v1/properties/{id}`: Single property details
* `PUT /api/v1/properties/{id}`: Update property
* `DELETE /api/v1/properties/{id}`: Archive property (Admin only)
* `GET /api/v1/properties/{id}/risk-summary`: Aggregated risk and inspection counts

### Inspection & Multi-Modal Uploads
* `POST /api/v1/inspections`: Create inspection report
* `GET /api/v1/inspections`: List authorized inspections
* `GET /api/v1/inspections/{id}`: Inspection details with signed image/audio URLs
* `POST /api/v1/inspections/{id}/images`: Upload photograph (JPEG, PNG, WebP validated with Pillow magic bytes)
* `POST /api/v1/inspections/{id}/audio`: Upload audio recording (WAV, MP3, FLAC, OGG)

### Real Analytical Engines
* `POST /api/v1/analyze/moisture`: OpenCV optical difference subtraction pipeline
* `POST /api/v1/analyze/moisture/upload`: Multipart optical photo analysis
* `POST /api/v1/analyze/acoustic`: SciPy Butterworth bandpass, FFT spectrum, Welch PSD
* `POST /api/v1/analyze/acoustic/upload`: Multipart acoustic recording analysis
* `POST /api/v1/analyze/multi-defect`: Cross-modal triage classification
* `POST /api/v1/forecast/property`: Weibull hazard reliability degradation

### Weather & Dew Point Intelligence
* `GET /api/v1/weather`: Real Open-Meteo psychrometric telemetry with Magnus-Tetens dew point calculation

### Risk Triage & Review
* `POST /api/v1/triage/calculate`: Explainable risk score (0.35 Optical + 0.25 Acoustic + 0.25 DewPoint + 0.15 Age)
* `POST /api/v1/triage/{id}/review`: Human surveyor review & sign-off

### Contractor Network & Work Orders
* `POST /api/v1/contractors/register`: Contractor registration (Pending Verification)
* `GET /api/v1/contractors`: Verified contractor directory
* `PUT /api/v1/contractors/{id}/verify`: Admin accreditation verification
* `POST /api/v1/work-orders`: Dispatch statutory remediation work order
* `GET /api/v1/work-orders`: List authorized work orders
* `PUT /api/v1/work-orders/{id}/status`: Status transition
* `POST /api/v1/work-orders/{id}/evidence`: Contractor photographic completion evidence upload

### Reports & Compliance
* `POST /api/v1/reports/generate`: Generates official PDF report dossier using ReportLab
* `GET /api/v1/notifications`: Real-time and statutory SLA alerts

---

## 6. Running Tests

Run the test suite with pytest:
```bash
cd backend
python -m pytest tests/test_backend.py -v
```

All 10 core unit tests cover:
1. Root operational status & engine versions
2. Database healthcheck
3. Argon2 password hashing & verification
4. JWT token creation, expiration, and decoding
5. HMAC time-limited signed URL tokens
6. OpenCV optical engine
7. SciPy acoustic engine
8. Magnus-Tetens psychrometric dew point calculation
9. Explainable cross-modal risk triage formula
10. ReportLab PDF report generation
