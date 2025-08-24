# Use a stable version of Python as the base
FROM python:3.10-slim

# Set the directory where your app will live inside the container
WORKDIR /app

# Copy the requirements file first and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Tell the container to open port 7860 for traffic
EXPOSE 7860

# The command to run when the container starts
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "app:app"]