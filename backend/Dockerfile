FROM python:3.13-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements from parent folder
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app folder
COPY app/ /app/

# Expose default port
EXPOSE 8000

# Run via run.py as entrypoint
ENTRYPOINT ["python", "run.py"]
