# YakkAI Frontend - User Portal

The YakkAI frontend is a state-of-the-art Single Page Application (SPA) designed to provide a premium and intuitive experience for managing cloud infrastructure. It is built with **React**, **TypeScript**, and **Material UI**.

## 🎨 Design Principles
- **Visual Distinction**: Clear differentiation between active (vibrant) and inactive (dull) resources.
- **Density**: Compact layouts to visualize complex hierarchical data efficiently.
- **Responsiveness**: Fluid layouts that adapt to various screen sizes.
- **Micro-animations**: Smooth transitions and feedback for a premium feel.

## 🛠️ Tech Stack
- **Library**: React 19 (Hooks, Context API)
- **Styling**: Material UI (MUI), Vanilla CSS
- **Build Tool**: Vite
- **Networking**: Axios (with interceptors for auth)
- **Icons**: Material UI Icons

## ⚙️ Development Setup

### 1. Prerequisites
Ensure you have **Node.js 18+** installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
The project uses different `.env` files for various environments:
- `.env.local_dev`: For local host development.
- `.env.docker_dev`: For running against a backend in Docker.
- `.env.dev`: For remote development/staging environments.

### 4. Running the Dev Server
```bash
# Default mode (uses .env.local_dev)
npm run dev
```

### 5. Production Build
To generate a production bundle:
```bash
npm run build
```

## 📁 Folder Structure
- `src/pages/`: Main application views (Tenants, Users, Cloud Accounts, etc.).
- `src/components/`: Reusable UI components (Common, Layout).
- `src/services/`: API abstractions for backend communication.
- `src/auth/`: Keycloak integration and authentication providers.
- `src/styles/`: Global CSS and component-specific styles.

## 🛡️ Authentication
Users are authenticated via **Keycloak**. The login state is managed by the `AuthProvider`, which handles token refreshing and logout logic automatically.
