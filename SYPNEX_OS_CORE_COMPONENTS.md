# Sypnex OS Core Components Documentation

## Overview

Sypnex OS is a modular operating system interface built with Flask that provides a platform for managing applications, services, and system resources. This document describes the core Python components that form the foundation of the system.

> **For Contributors**: This documentation is essential for understanding the system architecture before contributing. Each component is designed to be modular and extensible. See our [Contributing Guide](CONTRIBUTING.md) for specific areas where contributions are most needed.

## Core Architecture

The system follows a modular architecture with several key managers that handle different aspects of the operating system:

### 1. Application Entry Point (`app.py`)

**Purpose**: Main application entry point that orchestrates the entire system startup.

**Key Responsibilities**:
- Creates the Flask application instance
- Initializes all system managers
- Registers routes for all components
- Sets up WebSocket support
- Configures Swagger documentation

**Dependencies**: All other core components

### 2. Application Configuration (`app_config.py`)

**Purpose**: Central configuration management and system initialization.

**Key Features**:
- Defines built-in applications (User App Manager, System Settings, etc.)
- Creates and configures Flask app with CORS support
- Initializes all system managers (User App, Preferences, WebSocket, Terminal, Service, Virtual File)
- Sets default system preferences

**Built-in Apps**:
- User App Manager  
- System Settings
- WebSocket Server
- Terminal
- Virtual File System
- Resource Manager

### 3. Application Utilities (`app_utils.py`)

**Purpose**: Utility functions for application management and system operations.

**Key Functions**:
- `install_app_direct()`: Installs packaged apps directly into VFS
- `sanitize_user_app_content()`: Security function to block dangerous API calls
- `get_system_uptime()`: System uptime tracking
- `get_current_time_info()`: Time and date utilities

## System Management Components

### 4. System Boot Manager (`system_boot_manager.py`)

**Purpose**: Handles system initialization and boot-time operations.

**Key Features**:
- Manages system boot initialization
- Resets WebSocket server uptime on boot
- Manages system counters that reset on boot
- Tracks boot time and system uptime
- Provides boot information and statistics

**Database Tables**:
- `system_boot`: Boot time tracking
- `system_counters`: System-wide counters

### 5. Service Manager (`service_manager.py`)

**Purpose**: Manages Sypnex OS services including discovery, lifecycle, and persistence.

**Key Features**:
- Automatic service discovery from `services/` directory
- Service lifecycle management (start/stop)
- Service health monitoring and logging
- Configuration management for services
- Database persistence for service states

**Database Tables**:
- `services`: Service metadata and status
- `service_logs`: Service event logging

**Service Operations**:
- Discover and register services
- Start/stop services
- Monitor service health
- Manage service configurations
- Log service events

## File System and Storage

### 6. Virtual File Manager (`virtual_file_manager.py`)

**Purpose**: Manages a complete virtual file system stored in SQLite database.

**Key Features**:
- Complete file system abstraction
- File and directory operations
- Content storage with MIME type detection
- File metadata and hashing
- Thread-safe operations
- Path normalization and validation

**Database Tables**:
- `virtual_files`: File and directory storage
- `file_metadata`: Extended file metadata

**Operations**:
- Create/delete files and directories
- Read/write file content
- List directory contents
- File information and statistics
- System-wide statistics

### 7. User Preferences (`user_preferences.py`)

**Purpose**: Manages user preferences, window states, and app-specific settings.

**Key Features**:
- Hierarchical preference storage (category/key/value)
- Window position and size persistence
- App-specific settings management
- Preference import/export functionality
- Default preference management

**Database Tables**:
- `preferences`: General user preferences
- `app_window_states`: Window positions and sizes
- `app_settings`: App-specific settings

**Operations**:
- Get/set preferences by category and key
- Save/restore window states
- Manage app-specific settings
- Export/import preferences
- Reset all preferences

## User Interface and Applications

### 8. User App Manager (`user_app_manager.py`)

**Purpose**: Manages user-created applications and their discovery.

**Key Features**:
- App discovery from VFS
- App packaging and merging (HTML/CSS/JS)
- Template placeholder processing
- App search functionality

**App Sources**:
- VFS installed apps (`/apps/installed`)

**Operations**:
- Discover and load user apps
- Pack development apps into single HTML files
- Process template placeholders
- Search apps by keywords
- Refresh app discovery

### 9. Terminal Manager (`terminal_manager.py`)

**Purpose**: Provides command-line interface with extensible command system.

**Key Features**:
- Extensible command registry
- Built-in system commands
- User terminal app support
- Command execution and routing
- Terminal context management

**Built-in Commands**:
- File system: `ls`, `cd`, `pwd`, `cat`, `mv`, `rm`, `mkdir`, `touch`
- System: `help`, `show services`
- Service management: `start service`, `stop service`, `service logs`
- Python: `python`, `pip`
- Utility: `echo`, `cls`

### 10. Command Registry (`command_registry.py`)

**Purpose**: Extensible command system for terminal operations.

**Key Features**:
- Command registration and management
- Alias support
- Command execution with context
- Help system
- User terminal app integration

**Command Types**:
- Built-in system commands
- User terminal applications
- Function-based commands
- Service management commands

## Communication and Networking

### 11. WebSocket Manager (`websocket_manager.py`)

**Purpose**: Provides real-time WebSocket communication for applications.

**Key Features**:
- Real-time bidirectional communication
- Room-based messaging
- Connection health monitoring
- Message history
- Client management
- Automatic cleanup of dead connections

**WebSocket Events**:
- Connection/disconnection handling
- Room joining/leaving
- Message broadcasting
- Ping/pong health checks

**REST API Endpoints**:
- `GET /api/websocket/status`: Server status
- `GET /api/websocket/rooms`: Active rooms
- `GET /api/websocket/clients`: Connected clients
- `POST /api/websocket/broadcast`: Broadcast messages

## Documentation and API

### 12. Swagger Configuration (`swagger_config.py`)

**Purpose**: Automatic API documentation generation using Flasgger.

**Key Features**:
- Automatic route discovery
- API documentation generation
- Swagger UI integration
- Route analysis and tagging
- Response schema generation

**Documentation Categories**:
- Core system endpoints
- User applications
- Events
- WebSocket communication
- Terminal operations
- Service management
- Preferences
- Virtual file system

## System Architecture Summary

The Sypnex OS follows a layered architecture:

1. **Application Layer**: User apps and services
2. **Management Layer**: Various managers (Service, User App, etc.)
3. **Communication Layer**: WebSocket manager
4. **Storage Layer**: Virtual file system and preferences
5. **Interface Layer**: Terminal and REST APIs
6. **Documentation Layer**: Automatic Swagger documentation

## Key Design Principles

1. **Modularity**: Each component has a single responsibility
2. **Extensibility**: Service system allows for easy extension
3. **Persistence**: All data is stored in SQLite databases
4. **Real-time**: WebSocket support for live updates
5. **Security**: Content sanitization and access control
6. **Documentation**: Automatic API documentation generation

## Database Schema

The system uses three main SQLite databases:

1. **user_preferences.db**: User preferences, window states, app settings
2. **virtual_files.db**: Virtual file system storage
3. **Service-specific databases**: Managed by individual services

## Startup Sequence

1. Flask application creation
2. Manager initialization (Service, User App, etc.)
3. System boot initialization
4. Service discovery and restoration
5. Route registration
6. WebSocket initialization
7. Swagger documentation setup
