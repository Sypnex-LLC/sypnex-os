# Sypnex OS System Architecture

## Overview

Sypnex OS is a web-based desktop environment built with Flask and vanilla JavaScript. It provides a modular platform for running user applications in a sandboxed environment with persistent storage and service management.

**Key Innovation**: Everything runs in the browser but feels like a native OS - complete with file system, window management, and app ecosystem.

## Backend Architecture

### Core Application (`app.py`)
Main Flask application that initializes all system components and handles HTTP/WebSocket routing. Acts as the "kernel" that boots up all other managers.

### Virtual File System (`virtual_file_manager.py`)
Complete file system stored in SQLite with support for files, directories, metadata, and MIME type detection. All user data and app storage goes through the VFS - no actual files touch the host filesystem.

### User App Manager (`user_app_manager.py`)
Discovers and manages user applications from the VFS. Takes HTML/CSS/JS files and packages them into runnable apps with template processing and dependency injection.

### Service Manager (`service_manager.py`)
Manages background services with automatic discovery, lifecycle management, and health monitoring. Services run continuously in the background.

### User Preferences (`user_preferences.py`)
Stores user settings, window states, and app-specific configurations in SQLite with hierarchical organization. Remembers everything between sessions.

### WebSocket Manager (`websocket_manager.py`)
Handles real-time communication infrastructure between frontend and backend. WebSocket server is available for future live updates and notifications.

### System Boot Manager (`system_boot_manager.py`)
Manages system initialization, boot tracking, and system-wide counters. Handles the "boot sequence" that brings the OS online.

## Frontend Architecture

### Core OS (`static/js/os-core.js`)
Main OS class that orchestrates system functionality including time management, network monitoring, notifications, and keyboard shortcuts. Think of it as the "desktop environment" that coordinates everything.

### Window Management (`static/js/os-windows.js`)
Complete window system with drag-and-drop, resizing, state persistence, and app sandboxing. Each app runs in an isolated environment with controlled API access. Windows behave like native OS windows with proper z-indexing and focus management.

### App Discovery (`static/js/os-dashboard.js`)
App discovery interface with search, categorization, and app management functionality. Like a "Start Menu" or "Applications" folder that dynamically discovers installed apps.

### Search System (`static/js/os-spotlight.js`)
Global search interface with keyboard shortcuts for finding and launching applications. Hit a hotkey and search everything instantly.

### WebSocket Client (`static/js/os-websocket.js`)
Client-side WebSocket management infrastructure. Ready for real-time system updates when needed.

## API System

### SypnexAPI
JavaScript API provided to user applications for controlled system access. Apps get a rich API without breaking out of their sandbox:

- **VFS API**: File and directory operations (read, write, create, delete)
- **Preferences API**: App settings and user preferences storage
- **Notification API**: System notifications and alerts
- **Window API**: Window state management and controls

### App Sandboxing
User applications run in isolated environments with limited access to system resources through the SypnexAPI interface. Apps can't break out or interfere with each other.

## Data Flow

1. **App Installation**: Apps are packaged and stored in VFS (`/apps/installed/`)
2. **Discovery**: App Manager scans VFS and registers available apps
3. **Launch**: User clicks app → Window Manager creates sandbox → App loads with SypnexAPI
4. **Runtime**: App communicates via SypnexAPI → Backend processes requests → Updates returned to app
5. **Persistence**: All app data stored in VFS, window states saved in preferences

## Data Storage

### SQLite Databases
- `virtual_files.db`: Complete virtual file system
- `user_preferences.db`: User settings and app configurations

### VFS Structure
- `/apps/installed/`: User applications
- `/services/configs/`: Service configurations
- `/user/`: User data and documents

## Security Model

- Apps run in custom sandboxed environments
- Controlled API access through SypnexAPI
- Content sanitization for user-generated code
- VFS-based isolation between apps

## Development Workflow

1. User applications are developed locally
2. Apps are packaged and installed into VFS
3. App Manager discovers and serves applications
4. Apps run in sandboxed environment with API access
