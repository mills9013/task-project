# ─── Stage 1: builder ────────────────────────────────────────────────────────
# Install dependencies into an isolated prefix so the runtime image
# receives only the compiled wheels — no pip, setuptools, or build tools.
FROM python:3.12-slim AS builder

WORKDIR /build

# Upgrade pip once, then install production deps into /install.
# Pinned base image and --no-cache-dir keep the layer lean and reproducible.
COPY requirements.txt .
RUN pip install --upgrade pip --no-cache-dir \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# --- Security: non-root user -----------------------------------------------
RUN addgroup --gid 1001 appgroup \
 && adduser --uid 1001 --gid 1001 --no-create-home --disabled-password appuser

WORKDIR /app

# Copy only the installed packages from the builder stage.
COPY --from=builder /install /usr/local

# Copy application source.
COPY app/ ./app/

# Ownership — appuser only
RUN chown -R appuser:appgroup /app

USER appuser

# --- Container metadata -------------------------------------------------------
EXPOSE 8000

# Liveness probe — matches the /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# --- Entrypoint ---------------------------------------------------------------
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--log-level", "info"]
