# Overview

This is a modern email builder application built with React, TypeScript, and Express. The application provides a drag-and-drop interface for creating email templates and campaigns with real-time preview capabilities. Users can design emails using various components (text, buttons, images, dividers, etc.), save templates, and manage email campaigns.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and follows a component-based architecture:

- **Vite** as the build tool and development server for fast development experience
- **React Router (Wouter)** for client-side routing with a single-page application approach
- **TanStack Query** for server state management, caching, and API interactions
- **Tailwind CSS** with **shadcn/ui** components for consistent styling and design system
- **Custom drag-and-drop system** implemented with context providers for component palette interactions

### Key Frontend Patterns:
- Custom hooks pattern (`use-email-builder`, `use-mobile`, `use-toast`) for shared logic
- Context providers for global state management (drag-drop functionality)
- Component composition with shadcn/ui primitives
- Responsive design with mobile-first approach

## Backend Architecture

The backend uses Express.js with TypeScript in a RESTful API pattern:

- **Express.js** server with middleware for JSON parsing and request logging
- **File-based routing** with centralized route registration
- **In-memory storage** implementation with interface abstraction for future database integration
- **Zod schemas** for request validation and type safety

### API Design:
- RESTful endpoints for templates (`/api/templates`) and campaigns (`/api/campaigns`)
- Auto-save functionality for drafts with user-specific storage
- Standardized response format with success/error handling

## Data Storage Solutions

Currently uses an in-memory storage system with a well-defined interface:

- **IStorage interface** provides abstraction for future database implementations
- **MemStorage class** handles all CRUD operations for users, templates, and campaigns
- **Draft auto-save system** for preserving user work
- **Prepared for PostgreSQL** with Drizzle ORM configuration already in place

### Database Schema (Prepared):
- Users table with authentication fields
- Email templates with JSON-based element storage
- Email campaigns with status tracking
- Email elements with hierarchical structure support

## Email Generation System

Sophisticated email HTML generation with client compatibility:

- **Multi-client optimization** (Gmail, Outlook, Apple Mail)
- **Responsive email layouts** with table-based structure for maximum compatibility
- **Inline CSS** generation for email client support
- **Text fallback** generation for plain-text email clients
- **Template-based HTML** generation with proper email DOCTYPE and meta tags

## Component System

Modular email component architecture:

- **Draggable components** (text, button, image, divider, spacer, columns, social media)
- **Visual property editor** with real-time preview updates
- **Style inheritance** and cascading for consistent design
- **Element hierarchy** support for complex layouts

## Development Tools Integration

- **Replit-specific optimizations** with development banner and cartographer integration
- **TypeScript** with strict type checking and path aliases
- **ESBuild** for production bundling
- **Hot module replacement** in development mode

## External Dependencies

### Core Framework Dependencies
- **React 18** with modern hooks and concurrent features
- **Express.js** for backend API server
- **TypeScript** for type safety across the stack
- **Vite** for frontend build tooling and development server

### UI and Styling
- **Tailwind CSS** for utility-first styling approach
- **Radix UI** components via shadcn/ui for accessible, unstyled primitives
- **Lucide React** for consistent iconography
- **class-variance-authority** for component variant management

### Data Management
- **TanStack Query** for server state management and caching
- **Zod** for runtime type validation and schema definition
- **Drizzle ORM** with PostgreSQL dialect (configured but not actively used)
- **@neondatabase/serverless** for future PostgreSQL connectivity

### Development and Testing
- **@replit/vite-plugin-runtime-error-modal** for development error handling
- **@replit/vite-plugin-cartographer** for Replit integration
- **PostCSS** with Autoprefixer for CSS processing

### Future Integrations Prepared
- **PostgreSQL database** with Drizzle ORM for persistent storage
- **Authentication system** with user management
- **Email delivery services** integration ready
- **File upload** capabilities for image handling