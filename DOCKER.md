# Docker Deployment Guide for Sypnex OS

This guide explains how to deploy Sypnex OS using Docker and Docker Compose.

## 🚀 Quick Start

### Production Deployment

```bash
# Clone and navigate to the repository
git clone <repository-url>
cd sypnex-os

# Build and run with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:5000
```

### Local Development

```bash
# For local development with hot reloading
python run_dev.py
```

## 📁 Data Persistence

Sypnex OS stores all persistent data in the `/app/data` directory inside the container. This includes:

- SQLite databases (`virtual_files.db`, `user_preferences.db`)
- User-generated content
- Application state

### Data Volume Mounting

**Option 1: Named Volume (Recommended)**
```bash
# Default - uses Docker named volume
docker-compose up -d
```

**Option 2: Host Directory Mount**
```yaml
# In docker-compose.yml, replace the volumes section with:
services:
  sypnex-os:
    volumes:
      - ./data:/app/data  # Mount host directory

# Remove the volumes: section at the bottom
```

**Option 3: External Volume**
```bash
# Create external volume
docker volume create sypnex-persistent-data

# Update docker-compose.yml to use external volume:
volumes:
  sypnex-data:
    external: true
    name: sypnex-persistent-data
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Flask environment (`production`/`development`) |
| `FLASK_APP` | `app.py` | Flask application module |
| `PYTHONPATH` | `/app` | Python path for imports |

### Port Configuration

By default, Sypnex OS runs on port 5000. To change this:

```yaml
# In docker-compose.yml
services:
  sypnex-os:
    ports:
      - "8080:5000"  # Maps host port 8080 to container port 5000
```

## 🏗️ Build Options

### Production Build

```bash
# Build the production image
docker build -t sypnex-os:latest .

# Run manually
docker run -d \
  --name sypnex-os \
  -p 5000:5000 \
  -v sypnex-data:/app/data \
  sypnex-os:latest
```

### Development Build

```bash
# For local development (recommended)
python run_dev.py

# Or build development image with live code mounting
docker run -d \
  --name sypnex-os-dev \
  -p 5000:5000 \
  -v $(pwd):/app \
  -v sypnex-dev-data:/app/data \
  sypnex-os:latest
```

## 🔐 Security Considerations

### Production Security

1. **Run as non-root user**: The Docker image creates and uses a non-root `app` user
2. **Resource limits**: Consider adding resource limits in production:

```yaml
services:
  sypnex-os:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          memory: 512M
```

3. **Network security**: Consider using a reverse proxy for HTTPS in production if needed

## 🔄 Updates and Maintenance

### Updating Sypnex OS

```bash
# Pull latest changes
git pull origin master

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Data Backup

```bash
# Backup data volume
docker run --rm \
  -v sypnex-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/sypnex-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore data volume
docker run --rm \
  -v sypnex-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/sypnex-backup-YYYYMMDD.tar.gz -C /data
```

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find what's using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Change port in docker-compose.yml
ports:
  - "5001:5000"
```

**2. Permission Issues**
```bash
# Fix data directory permissions (Linux/macOS)
sudo chown -R 1000:1000 ./data

# On Windows with Docker Desktop, this is usually not needed
```

**3. Container Won't Start**
```bash
# Check logs
docker-compose logs sypnex-os

# Debug interactively
docker run -it --rm sypnex-os:latest /bin/bash
```

**4. Database Issues**
```bash
# Reset databases (WARNING: This deletes all data)
docker-compose down
docker volume rm sypnex-os_sypnex-data
docker-compose up -d
```

### Health Check

The containers include health checks. Check status:

```bash
# View container health
docker ps
docker-compose ps

# Detailed health info
docker inspect sypnex-os | grep -A 10 Health
```

## 📊 Monitoring

### Container Stats

```bash
# Real-time stats
docker stats sypnex-os

# Resource usage
docker-compose exec sypnex-os top
```

### Application Logs

```bash
# Follow logs
docker-compose logs -f sypnex-os

# Last 100 lines
docker-compose logs --tail=100 sypnex-os
```

## 🚀 Advanced Deployment

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml sypnex
```

### Kubernetes

See `k8s/` directory for Kubernetes manifests (if available).

## 🔗 Related Files

- `Dockerfile` - Production container image
- `docker-compose.yml` - Production deployment
- `gunicorn.conf.py` - Gunicorn production server configuration
- `wsgi.py` - WSGI entry point for gunicorn
- `run_dev.py` - Local development server with hot reloading
- `.dockerignore` - Docker build exclusions

## 💡 Tips

1. **Performance**: Use SSDs for data volumes in production
2. **Monitoring**: Consider adding Prometheus metrics
3. **Scaling**: Sypnex OS is designed as a single-user system
4. **Backup**: Regular backups are essential for production use
5. **Updates**: Test updates in development environment first
