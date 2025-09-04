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

Modern React.email-based email generation following official Resend patterns with Gmail-optimized compatibility:

- **React.email Components** - Using official `@react-email/components` for maximum compatibility
- **Official Resend Integration** - Follows exact pattern from Resend documentation
- **Gmail-Compatible Table Structures** - Text elements use spacer cell approach for reliable padding across all email clients
- **Multi-client optimization** (Gmail, Outlook, Apple Mail) via React.email's tested components and custom Gmail compatibility fixes
- **Email Width Flexibility** - Supports 320px to 800px email widths (320px, 480px, 600px, 650px, 700px, 750px, 800px)
- **Responsive email layouts** with React.email's responsive primitives
- **Markdown Text Support** - Bold and italic formatting with proper HTML conversion for email clients
- **TypeScript Support** - Full type safety with React.email components
- **Dual Mode Support** - React component export for Resend + HTML preview for testing

## Component System

Modular email component architecture with comprehensive styling support:

- **Draggable components** (text, button, image, divider, spacer, columns, social media)
- **Visual property editor** with real-time preview updates
- **Complete Style Transfer** - All margin, padding, color, and typography settings transfer correctly from preview to sent emails
- **Nested Element Support** - Full styling support for elements inside columns and sections
- **Gmail-Compatible Rendering** - Text elements use table-based spacer approach for reliable cross-client rendering
- **Style inheritance** and cascading for consistent design
- **Element hierarchy** support for complex layouts

## Development Tools Integration

- **Replit-specific optimizations** with development banner and cartographer integration
- **TypeScript** with strict type checking and path aliases
- **ESBuild** for production bundling
- **Hot module replacement** in development mode

## Recent Architectural Improvements (September 2024)

### Email Client Compatibility Enhancements
- **Gmail Padding Fix**: Implemented table-based spacer cell approach for text elements to ensure padding renders correctly in Gmail
- **Cross-Client Testing**: All styling now verified across Gmail, Outlook, and Apple Mail
- **Width Flexibility**: Extended email width options from 320px-800px for modern email design needs

### Styling System Overhaul
- **Complete Style Transfer**: Fixed critical issues where margin, padding, and styling from preview wasn't appearing in sent emails
- **Nested Element Support**: Resolved updateElement function to properly handle styling for elements inside columns and sections
- **Property Mapping**: Enhanced style property mapping to handle all UI variations (paddingX/paddingY, marginTop/marginBottom, etc.)

### Integration Points for AI Development
- **Email Width API**: All send endpoints now properly respect emailWidth parameter (320-800px)
- **Style Consistency**: Preview styling guaranteed to match sent email appearance
- **Markdown Support**: Text elements support **bold** and *italic* markdown with proper HTML conversion
- **Resend API Integration**: Full compatibility with Resend's email delivery service using React.email patterns

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