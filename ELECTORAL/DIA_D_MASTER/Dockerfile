FROM python:3.11-slim

WORKDIR /app

# Copiar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Puerto
EXPOSE 8000

# Iniciar servidor
CMD ["python", "server.py", "--port", "8000", "--host", "0.0.0.0"]
