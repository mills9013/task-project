# Task Project — Full-Stack Weather Application

A complete full-stack mobile application demonstrating a React Native (Expo) frontend, a Python (FastAPI) backend, and automated deployment pipelines via GitHub Actions.

## Architecture Overview

```text
┌────────────────┐      HTTPS (REST)      ┌─────────────────────────┐
│                │                        │                         │
│  Mobile App    │ ─────────────────────► │  FastAPI Backend        │
│  (Expo / RN)   │                        │  (AWS ECR / ECS)        │
│                │ ◄───────────────────── │                         │
└───────┬────────┘                        └──────────┬──────────────┘
        │                                            │ (Proxy)
        │                                            ▼
        │                                 ┌─────────────────────────┐
        │                                 │  Open-Meteo API         │
        │                                 │  (Geocoding + Forecast) │
        │                                 └─────────────────────────┘
        ▼
┌────────────────┐
│  TestFlight    │
│  (via EAS)     │
└────────────────┘
```

The application is a simple Weather Dashboard that allows users to search for a city and view the current conditions alongside a 7-day forecast.

The backend acts as an intelligent proxy to the public Open-Meteo API, providing:
- Input validation via Pydantic
- Automatic city-to-coordinate geocoding
- Response shaping (transforming raw API data into a clean, typed schema for the client)
- In-memory TTL caching (5 minutes) to reduce upstream API calls

## Repository Structure

- `frontend/`: React Native mobile application using Expo (SDK 57) and Expo Router.
- `backend/`: Python backend service using FastAPI, containerized with Docker.
- `infra/`: AWS IAM policies for setting up OIDC federation for GitHub Actions.
- `.github/workflows/`: CI/CD pipelines.

## Local Setup

### Backend (FastAPI)

Prerequisites: Python 3.12+

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Run the tests
pytest

# Start the dev server
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

### Frontend (Expo)

Prerequisites: Node.js 22+

```bash
cd frontend
npm install

# Start the Expo development server
npx expo start
```

Press `i` to open in an iOS simulator, `a` for Android, or `w` for the web.

## Pipelines (CI/CD)

### Backend: GitHub Actions -> Amazon ECR
- Triggered on push to `main` when `backend/` files change.
- Runs `ruff` (linting) and `pytest` (unit tests).
- If checks pass, builds a multi-stage Docker image and pushes it to Amazon ECR.
- Uses **OIDC Federation** to authenticate with AWS, eliminating the need for long-lived access keys.
- Tags the image with both `latest` and the short git SHA for traceability.

### Frontend: GitHub Actions -> EAS -> TestFlight
- Triggered on push to `main` when `frontend/` files change (or manually via workflow dispatch).
- Uses the Expo Application Services (EAS) CLI.
- Runs `eas build` targeting the `production` profile for iOS.
- Runs `eas submit` to automatically upload the resulting IPA to Apple TestFlight.
- All credentials are kept out of source control and managed via GitHub Secrets.

## Configuration & Secrets (CI/CD Setup)

To enable the GitHub Actions CI/CD pipelines, you must configure the following Secrets and Variables in your GitHub Repository (**Settings > Secrets and variables > Actions**).

### 1. Backend CI/CD (AWS ECR)
The backend uses AWS OIDC authentication. You must configure the OIDC provider in your AWS account (see the `infra/` folder) and set the following **Repository Variables**:
- `AWS_ACCOUNT_ID`: Your 12-digit AWS Account ID (e.g., `123456789012`).
- `AWS_REGION`: The AWS Region your ECR repo resides in (e.g., `us-east-1`).
- `ECR_REPOSITORY`: The name of the Elastic Container Registry repository.

### 2. Frontend CI/CD (EAS to TestFlight)
The frontend uses Expo Application Services (EAS) to build and submit the app.
Set the following **Repository Secrets**:
- `EXPO_TOKEN`: Create a Robot token from your Expo dashboard (Settings > Access tokens).
- `ASC_APP_ID`: App Store Connect App ID (The 10-digit "Apple ID" found in App Store Connect under General > App Information).
- `APPLE_ID`: Your Apple Developer account email address.
- `APPLE_TEAM_ID`: Your 10-character alphanumeric Apple Team ID.

**Crucial First-Time Setup Step (Apple Credentials):**
Before the CI/CD pipeline can build your iOS app non-interactively on GitHub Actions, you **must** generate Apple Distribution Certificates and Provisioning Profiles and save them to Expo's servers. Run this locally in your terminal exactly once:

```bash
cd frontend
npx eas credentials
```

Follow the interactive prompts to select **iOS** -> **production** -> **All**. Log in to Apple when asked and allow EAS to automatically generate and sync the required credentials. Once setup is complete, the GitHub Actions pipeline will successfully build and submit your app!

## Trade-offs & Design Decisions

1. **Choice of Public API:** Open-Meteo was chosen because it provides high-quality weather data without requiring an API key. This ensures the codebase remains completely free of embedded credentials and simplifies local setup for reviewers.
2. **Monorepo Structure:** The frontend and backend are kept in a single repository to simplify the assessment review process and allow for atomic commits that touch both sides. In a larger organization, these might be split into separate repos.
3. **In-Memory Caching:** The backend uses a simple Python dictionary for TTL caching rather than a full Redis instance. This is sufficient for the scale of this assessment and reduces infrastructure complexity.
4. **Environment Variables:** The frontend reads `apiBaseUrl` from `expo-constants` `extra`. In a real-world scenario with multiple environments, this would be populated from a `.env` file during the EAS build process.

## Time Spent

- ~3 hours for complete implementation (scaffolding, backend, frontend integration, Docker, CI/CD pipelines, documentation).
