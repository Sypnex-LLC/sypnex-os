# Sypnex OS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

A web-based operating system interface built with Flask and vanilla JavaScript, providing a desktop-like experience with window management, app sandboxing, and API system for user applications.

> **🚀 Active Development**: Sypnex OS is an open-source project in active development. We welcome contributions to help reach production readiness. Whether you're interested in feature development, testing, documentation, or UI/UX improvements, contributions are welcome.


# Demo

Here's a quick demo of Sypnex OS:

https://www.youtube.com/watch?v=xaooKK8Qop8


## 🚀 Quick Start

Sypnex OS is a **web-based desktop environment** that runs in your browser. Think of it as a complete operating system interface that you can deploy via Docker and own completely.

### Key Concepts
- **Web Desktop**: Familiar window management, taskbar, and file system - all in your browser
- **App Ecosystem**: Create and run sandboxed applications with JavaScript APIs
- **Virtual File System**: Complete file storage and management within the OS
- **Service System**: Extensible architecture for system enhancements
- **Real-time Communication**: WebSocket-powered live updates and messaging

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐ ┌─────────────┐                            │
│  │  User Apps  │ │  Services   │                            │
│  └─────────────┘ └─────────────┘                            │
├─────────────────────────────────────────────────────────────┤
│                   Management Layer                          │
│  ┌─────────────┐ ┌─────────────┐                            │
│  │ App Manager │ │Service Mgr  │                            │
│  └─────────────┘ └─────────────┘                            │
├─────────────────────────────────────────────────────────────┤
│                  Communication Layer                        │
│ ┌─────────────┐ ┌─────────────┐                             │
│ │WebSocket    │ │Terminal     │                             │
│ └─────────────┘ └─────────────┘                             │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │Virtual File │ │Preferences  │ │System Boot  │            │
│  │   System    │ │             │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 What is Sypnex OS?

**Sypnex OS** is a modular web-based operating system that runs in your browser. It provides a desktop experience with development tools, real-time communication, and integration capabilities.

Think of it as a **web desktop** that connects to backend services, AI models, and external APIs. It's designed for developers, AI researchers, and users who need a flexible platform for building and managing applications.

### Why Sypnex OS?

**Own Your Environment**: Deploy via Docker and control your entire environment without vendor lock-in.

**Modularity**: Built with extensibility in mind. Every component is modular, from services to UI elements.

**Security**: App sandboxing ensures safety while maintaining API access for applications.

**Web Standards**: Built with vanilla JavaScript and modern web APIs.

**AI Integration**: Designed to integrate with AI models and external APIs for modern development workflows.

Sypnex OS provides a customizable development environment that you can own and modify. Whether you're building AI applications, need a sandboxed environment, or want to create web-based tools, Sypnex OS provides the foundation.

## 📱 Official Apps Repository

Looking for apps to use with Sypnex OS? Check out our **[Official Apps Repository](https://github.com/Sypnex-LLC/sypnex-os-apps)** which contains:

- **Ready-to-use Applications**: Download and install apps directly into your Sypnex OS instance
- **Development Tools**: Utilities for building and packaging your own apps
- **Example Applications**: Sample apps demonstrating various features and APIs
- **App Templates**: Starting points for creating new applications

The apps repository is separate from the core OS to allow for faster iteration and community contributions focused on application development.

### Repository Structure

- **[sypnex-os](https://github.com/Sypnex-LLC/sypnex-os)** (this repository): Core operating system, APIs, and documentation
- **[sypnex-os-apps](https://github.com/Sypnex-LLC/sypnex-os-apps)**: Official applications, development tools, and app examples

## 🤖 Built with AI Collaboration

Sypnex OS was built through collaboration between human creativity and AI assistance. What started as experimental "vibe coding" sessions evolved into a comprehensive operating system that demonstrates the potential of human-AI partnership in software development.

### The Development Story
- **Started with Vision**: A human idea for a web-based OS that could be owned and customized
- **AI-Assisted Architecture**: Core system architecture and components designed through iterative AI collaboration
- **Continuous Refinement**: Features, APIs, and documentation developed through ongoing human-AI partnership
- **Community-Driven Evolution**: Now transitioning to community contributions while maintaining the AI-assisted development approach

This project showcases how modern AI tools can amplify human creativity to build complex software. The majority of the codebase was generated through AI assistance, with human guidance, refinement, and strategic direction throughout the process.

This represents an approach where human insight combines with AI capabilities to create software development outcomes.

## 🎯 Key Features

### Core Interface
- **Desktop Experience**: Window management, taskbar, and spotlight search
- **Real-time Communication**: WebSocket-powered live updates and notifications
- **Service System**: Extensible architecture with hot-reloadable services
- **Virtual File System**: SQLite-based file storage with full CRUD operations
- **User App Ecosystem**: Sandboxed applications with JavaScript API access

### System Features
- **Event System**: System-wide event management for workflow coordination
- **Service Management**: Lifecycle management for background services
- **Settings Persistence**: App-specific configuration storage
- **Command System**: Extensible terminal with built-in and user commands

## 🏗️ Architecture

Sypnex OS follows a **layered architecture** with modular components:

### Core Components
- **Application Layer**: User apps and services
- **Management Layer**: Service Manager, User App Manager, Terminal Manager
- **Communication Layer**: WebSocket Manager
- **Storage Layer**: Virtual File Manager, User Preferences, System Boot Manager
- **Interface Layer**: Terminal, REST APIs, SypnexAPI for JavaScript

### Frontend Architecture
- **Core OS Layer**: Essential OS functionality (`os-*.js`)
- **API Layer**: JavaScript APIs for user applications (`sypnex-api-*.js`)
- **Template Layer**: System app templates and UI components
- **Application Layer**: Sandboxed app environments with injected APIs

## 🔧 Quick Start

### Prerequisites
- Python 3.7 or higher
- Modern web browser

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sypnex-os

# Install dependencies
pip install -r requirements.txt

# Run the application
python run_dev.py

# Open browser to http://localhost:5000
```

## 🤝 Community & Contributing

[![Discord](https://img.shields.io/badge/Join_our_Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/5eJ65MF7Ty)

We're building a community around Sypnex OS and welcome contributions of all kinds.

### Getting Help & Discussions
- **Questions & Support**: [GitHub Discussions](https://github.com/Sypnex-LLC/sypnex-os/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/Sypnex-LLC/sypnex-os/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/Sypnex-LLC/sypnex-os/issues) with the `enhancement` label

### Contributing
We welcome contributions in these areas:
- **Feature Development**: Core OS features, new APIs, and system improvements
- **Application Development**: Sample apps and developer tools in the [official apps repository](https://github.com/Sypnex-LLC/sypnex-os-apps)
- **Testing & QA**: Bug testing, performance testing, cross-browser compatibility
- **Documentation**: Guides, API documentation, and tutorials
- **UI/UX**: Interface improvements and accessibility enhancements

See our [Contributing Guide](CONTRIBUTING.md) for detailed information on submitting pull requests.

### Areas Where You Can Make a Significant Impact
1. **Cross-browser Testing**: Ensuring compatibility across all major browsers
2. **Performance Optimization**: Improving load times and responsiveness
3. **Enhanced Security**: Strengthening the app sandboxing system
4. **Developer Tools**: Better debugging and development utilities
5. **Sample Applications**: More examples to showcase capabilities in the [official apps repository](https://github.com/Sypnex-LLC/sypnex-os-apps)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. This means you're free to use, modify, and distribute Sypnex OS for any purpose, including commercial use.

## 📚 Documentation

- [🚀 Roadmap](ROADMAP.md) - Project vision and development milestones
- [🤝 Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [⚙️ Core Components](SYPNEX_OS_CORE_COMPONENTS.md) - Detailed architecture and system components
- [🖥️ Frontend Architecture](SYPNEX_OS_FRONTEND_ARCHITECTURE.md) - Frontend system design and APIs
- [📱 User App Development](USER_APP_DEVELOPMENT_GUIDE.md) - Guide for creating user applications

---

*Thank you for exploring Sypnex OS.*