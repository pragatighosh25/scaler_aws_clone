# AWS Route 53 Clone

A comprehensive web application that mimics the core functionalities of AWS Route 53. Built with a modern tech stack featuring a Next.js frontend and a FastAPI backend.

## Features

- **Hosted Zones Management**: Create, list, and delete hosted zones easily.
- **DNS Records Management**: Add, view, edit, and delete various types of DNS records within your hosted zones.
- **Import/Export Capabilities**: Import and export DNS configurations (e.g., BIND format) for seamless migrations.
- **User Isolation**: Secure architecture ensuring each user can only access and manage their own hosted zones and records.
- **Modern UI**: A responsive, aesthetically pleasing interface with full Dark Mode support, powered by Tailwind CSS.

## Architecture Overview

The application follows a decoupled client-server architecture:

1. **Frontend (Next.js)**:
   - Built with Next.js App Router and React.
   - Handles the user interface, routing, and client-side state.
   - Styled using Tailwind CSS and modern UI components.
   - Communicates with the backend via RESTful API calls (`src/lib/api.ts`).

2. **Backend (FastAPI)**:
   - A high-performance Python backend built with FastAPI.
   - Exposes RESTful API endpoints for authentication, hosted zones, and DNS records.
   - Uses SQLAlchemy as the ORM to interact with the database.
   - Enforces user isolation by tying hosted zones and records to specific user IDs.

3. **Database (SQLite)**:
   - A persistent SQLite database (`.db` file) is used for local storage.
   - Can be easily swapped out for PostgreSQL or MySQL in production via environment variables.

## Database Schema

The core database schema consists of four main tables:

1. **Users (`users`)**
   - `id` (Integer, Primary Key)
   - `username` (String, Unique)
   - `password_hash` (String)
   - `aws_account_id` (String, Unique)

2. **Hosted Zones (`hosted_zones`)**
   - `id` (String, Primary Key)
   - `name` (String, e.g., `example.com.`)
   - `comment` (String, Optional)
   - `private_zone` (Boolean)
   - `user_id` (Integer, Foreign Key to `users.id`)

3. **DNS Records (`dns_records`)**
   - `id` (String, Primary Key)
   - `hosted_zone_id` (String, Foreign Key to `hosted_zones.id`)
   - `name` (String, e.g., `www.example.com.`)
   - `type` (String, e.g., A, AAAA, CNAME, TXT)
   - `ttl` (Integer, e.g., 300)
   - `values` (String, Newline-separated)
   - `routing_policy` (String)
   - `weight` (Integer, Optional)

4. **DNS Changes (`dns_changes`)**
   - `id` (String, Primary Key)
   - `hosted_zone_id` (String)
   - `status` (String, e.g., PENDING, INSYNC)
   - `submitted_at` (DateTime)
   - `comment` (String, Optional)

## API Overview

The FastAPI backend exposes the following key REST endpoints (interactive documentation is available at `/docs` when running the backend):

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register a new user account.
- `POST /api/auth/login`: Authenticate a user and return an access token.

### Hosted Zones (`/2013-04-01/hostedzone`)
- `GET /2013-04-01/hostedzone`: List all hosted zones for the authenticated user.
- `POST /2013-04-01/hostedzone`: Create a new hosted zone.
- `GET /2013-04-01/hostedzone/{id}`: Get details of a specific hosted zone.
- `DELETE /2013-04-01/hostedzone/{id}`: Delete a hosted zone.

### DNS Records (`/2013-04-01/hostedzone/{id}/rrset`)
- `GET /2013-04-01/hostedzone/{id}/rrset`: List all DNS records in a hosted zone.
- `POST /2013-04-01/hostedzone/{id}/rrset`: Change (Create, Update, Delete) DNS records in a hosted zone.

### Import/Export (`/api/import`, `/api/export`)
- `POST /api/import/bind`: Import a BIND zone file into a hosted zone.
- `GET /api/export/bind/{zone_id}`: Export a hosted zone's records to BIND format.

## Local Development Setup

Follow these steps to run the project locally on your machine.

### Prerequisites
- Node.js (v18 or higher)
- Python (3.8 or higher)

### Frontend Setup

1. Open your terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend` directory and define the local API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:3000`.

### Backend Setup

1. Open a new terminal window and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows**:
     ```bash
     .\venv\Scripts\activate
     ```
   - **Mac/Linux**:
     ```bash
     source venv/bin/activate
     ```
4. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be accessible at `http://localhost:8000`. You can view the automatic API documentation (Swagger UI) at `http://localhost:8000/docs`.

## Deployment

For detailed instructions on deploying this project to production (e.g., hosting the frontend on Vercel and the backend on Railway), please refer to the [Deployment Guide](./deployment_guide.md).
