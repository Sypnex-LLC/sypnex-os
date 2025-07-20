# App Store

A simple app store for Sypnex OS that allows users to browse and install available user applications.

## Features

- **Browse Available Apps**: View all apps available in the latest release
- **Install Apps**: One-click installation of apps from the store
- **Search & Filter**: Find apps quickly using the search functionality
- **Installation Status**: Clear indication of which apps are already installed
- **Manual Refresh**: Check for new apps with the refresh button
- **Responsive Design**: Works well on different screen sizes

## How It Works

The app store fetches available applications from the `/api/updates/latest` endpoint, which provides:
- App download URLs
- Version information
- App metadata

It then cross-references this with installed apps from `/api/apps` to show installation status.

## Installation Process

When you click "Install" on an app:
1. The app downloads the `.bin` file from the provided URL
2. Uses the `/api/user-apps/update/` endpoint to install the app
3. Refreshes the app registry to recognize the new app
4. Updates the UI to reflect the installation

## Usage

1. Open the App Store from the desktop or app launcher
2. Browse available apps in the grid view
3. Use the search box to find specific apps
4. Click "Install" on any app you want to add to your system
5. Use "Refresh" to manually check for newly released apps

The app store shows which apps are already installed and prevents duplicate installations.

## Technical Details

- Built using the SypnexAPI framework
- Uses modern CSS Grid for responsive app layout
- Implements proper loading states and error handling
- Follows Sypnex OS design patterns and styling
- Manual refresh only - no auto-polling to respect API limits
