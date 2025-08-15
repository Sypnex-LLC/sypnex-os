# Authentication Setup Guide

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate password hashes for your users:**
   ```bash
   python generate_password.py
   ```
   Follow the prompts and copy the generated line to your `.env` file.

3. **Edit your `.env` file with the generated credentials:**
   ```bash
   nano .env
   ```

## Password Generation

### Option 1: Using the Password Generator Script (Recommended)
```bash
# Interactive mode - create your own credentials
python generate_password.py

# Demo mode - see example output format
python generate_password.py --demo
```
This interactive script will:
- Prompt for username and password (password input is hidden)
- Generate a secure bcrypt hash
- Output the properly formatted AUTH_USER_X line
- Provide clear copy-paste instructions

### Option 2: Manual Generation (Advanced)
```python
python -c "import bcrypt; print('AUTH_USER_1=yourusername:' + bcrypt.hashpw('yourpassword'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'))"
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AUTH_USER_1` | First user (username:hash) | `demo:$2b$12$...` |
| `AUTH_USER_2` | Second user (optional) | `admin:$2b$12$...` |
| `INSTANCE_NAME` | JWT issuer identifier | `my-sypnex-instance` |
| `SESSION_SECRET_KEY` | JWT signing key | `super-secret-key-123` |

## Docker Deployment

The `docker-compose.yml` includes demo credentials for testing:
- **Username:** `demo`
- **Password:** `demo123`

**⚠️ Important Notes:**
- Change the demo credentials for production use!
- When adding bcrypt hashes to `docker-compose.yml`, escape dollar signs by doubling them (`$$`)
- Example: `$2b$12$hash...` becomes `$$2b$$12$$hash...` in docker-compose.yml

**⚠️ Change these for production use!**

## Security Notes

- `.env` file is excluded from git
- Use strong, unique `SESSION_SECRET_KEY` for each instance
- JWT tokens expire automatically after 24 hours