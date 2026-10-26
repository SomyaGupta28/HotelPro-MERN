# HotelPro — Hotel Booking and Management System

HotelPro is a MERN-style hotel booking demo with a React/Vite frontend, Express API, MongoDB, JWT authentication, room booking, booking history, and an admin panel for adding rooms and reviewing reservations.

## Requirements
- Node.js 20 LTS or newer
- npm
- MongoDB Community Server or MongoDB Atlas

## Run locally (Windows / VS Code)
Open the extracted `HotelPro_MERN_Project` folder in VS Code.

### 1. Backend setup
Open the first terminal:

```powershell
cd backend
copy .env.example .env
npm install
```

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hotelpro
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@hotelpro.com
CLIENT_URL=http://localhost:5173
```

Start MongoDB locally first, or replace `MONGODB_URI` with your Atlas connection string. Then run:

```powershell
npm run dev
```

Check `http://localhost:5000/api/health` — it should return JSON with `status: "ok"`.

### 2. Frontend setup
Open a second terminal in VS Code:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

### 3. Use the admin panel
1. In `backend/.env`, set `ADMIN_EMAIL` to the email you want to use for the admin account.
2. Restart the backend after changing `.env`.
3. In HotelPro, create an account using that exact email address. The backend assigns the `admin` role to that email when the account is first created.
4. Log in. The **Admin panel** navigation link will appear. Use it to add rooms and review reservations.

For a local demo, do not use a real personal password. For a public deployment, do not expose the admin email or credentials in screenshots or source control. The current demo's email-based first-registration admin setup should be replaced with a controlled seed/invite process before production use.

## Build check
From the `frontend` folder:

```powershell
npm run build
```

The production files are generated in `frontend/dist`.

## Deployment overview
1. Push the project to a GitHub repository. The `.gitignore` excludes `.env`, `node_modules`, and build output.
2. Create a MongoDB Atlas database and allow network access for the chosen backend host.
3. Deploy the backend service from the `backend` directory on a Node-compatible host. Set `PORT` (provided by the host), `MONGODB_URI`, a strong unique `JWT_SECRET`, `ADMIN_EMAIL`, and `CLIENT_URL` as service environment variables. `CLIENT_URL` may contain comma-separated allowed frontend origins.
4. Deploy the frontend from the `frontend` directory on a static host (for example, Vercel or Netlify). Set `VITE_API_URL` to the deployed backend URL ending in `/api`, e.g. `https://YOUR-BACKEND.example.com/api`, before building.
5. Add the final frontend domain to the backend `CLIENT_URL`, redeploy the backend, and test registration, login, room creation, and bookings on the live site.

Do not commit real `.env` files, database passwords, JWT secrets, or private credentials to GitHub. Replace all placeholder values in the hosting dashboards. A deployment URL is only a demo link after you have actually deployed and tested it.

## API endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/rooms`
- `POST /api/rooms` (admin)
- `GET /api/admin/bookings` (admin)
- `POST /api/bookings` (authenticated user)
- `GET /api/bookings/mine` (authenticated user)
- `PATCH /api/bookings/:id/cancel` (booking owner)

## Current demo limitations
This is a student/demo project, not a production-ready booking platform. It does not include payment processing, email verification, password reset, rate limiting, or comprehensive audit logging. Before real-world use, review authorization, validation, and the admin account creation process.
