# AWS Route 53 Clone

A comprehensive web application that mimics the core functionalities of AWS Route 53. Built with a modern tech stack featuring a Next.js frontend and a FastAPI backend.

## Features

- **Hosted Zones Management**: Create, list, and delete hosted zones easily.
- **DNS Records Management**: Add, view, edit, and delete various types of DNS records within your hosted zones.
- **Import/Export Capabilities**: Import and export DNS configurations (e.g., BIND format) for seamless migrations.
- **User Isolation**: Secure architecture ensuring each user can only access and manage their own hosted zones and records.
- **Modern UI**: A responsive, aesthetically pleasing interface with full Dark Mode support, powered by Tailwind CSS.

## Tech Stack

**Frontend**
- Next.js (React Framework)
- TypeScript
- Tailwind CSS
- Lucide React (Icons)

**Backend**
- FastAPI (Python Web Framework)
- SQLAlchemy (ORM)
- SQLite (Persistent Database)

## Deployment

For detailed, step-by-step instructions on how to deploy this project to production (e.g., hosting the frontend on Vercel and the backend on Railway), please refer to the [Deployment Guide](./deployment_guide.md).

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

## Database Management

The backend uses a local SQLite database (`.db` file) by default. When deploying to production services like Railway, it is important to configure a persistent volume mount so the database file is retained across deployments, or switch to a managed PostgreSQL/MySQL database by updating the `DATABASE_URL` environment variable.
