# ED-IQ Backend API

## Project Overview

This is the backend API for the ED-IQ Educational Intelligence Platform, built using Python and the FastAPI framework. It provides a comprehensive set of functionalities for managing an educational platform, including user authentication, user management, classroom subjects, lectures, activities, submissions, grading, notifications, real-time communication via WebSockets, offline score handling, and an AI-powered chatbot.

The project leverages a PostgreSQL database for data storage, managed through SQLAlchemy (ORM) and Alembic for database migrations. Supabase is integrated for external backend services, primarily for object storage (e.g., profile pictures). For background tasks and self-monitoring, `APScheduler` is used to implement a heartbeat mechanism that pings the application's health endpoint.

**Key Technologies:**
*   **Backend Framework:** FastAPI
*   **Database:** PostgreSQL
*   **ORM:** SQLAlchemy
*   **Database Migrations:** Alembic
*   **Authentication/Authorization:** JWT (handled via dependencies), `bcrypt` for password hashing
*   **File Storage:** Supabase Storage
*   **Real-time Communication:** WebSockets
*   **Scheduled Tasks:** APScheduler
*   **Environment Management:** `python-dotenv`
*   **ASGI Server:** Uvicorn

## Building and Running

### Prerequisites

*   Python 3.8+
*   PostgreSQL database instance
*   Supabase project with enabled Storage bucket

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Backend
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # On Windows
    .\venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Environment Variables

Create a `.env` file in the root of the `Backend` directory with the following variables:

```dotenv
DATABASE_URL="postgresql://user:password@host:port/dbname"
SUPABASE_URL="https://your-supabase-project-id.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
SUPABASE_BUCKET="your-supabase-storage-bucket-name"
# Other environment variables as needed, e.g., JWT secret key
```

### Database Migrations

Apply pending database migrations using Alembic:

```bash
alembic upgrade head
```

### Running the Application

Start the FastAPI application using Uvicorn:

```bash
uvicorn main:app --reload
```

The API will typically be available at `http://127.0.0.1:8000`.

## Development Conventions

*   **Code Structure:**
    *   `main.py`: Main FastAPI application instance and router inclusion.
    *   `routes/`: Contains individual router modules for different API functionalities (e.g., `user_management.py`, `auth.py`).
    *   `models/`: Defines SQLAlchemy ORM models.
    *   `schemas/`: Defines Pydantic models for request/response validation and serialization.
    *   `utils/`: Contains utility functions and services (e.g., `supabase.py` for Supabase interactions, `scheduler.py` for background tasks).
    *   `alembic/`: Alembic migration scripts and configuration.
*   **Database Interaction:** SQLAlchemy ORM is used for all database operations, with sessions managed via FastAPI's dependency injection (`database.get_db`).
*   **API Design:** Follows RESTful principles using FastAPI's decorators and Pydantic for data validation.
*   **Authentication:** Utilizes JWT for securing endpoints.
*   **File Uploads:** Handled via FastAPI's `UploadFile` and stored in Supabase Storage.
*   **Scheduled Tasks:** `APScheduler` is configured to run background jobs, such as a health check heartbeat.
