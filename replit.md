# AI-SPM (Fyx Cloud AI) - AI Security Posture Management Platform

## Overview
Fyx Cloud AI is a multi-tenant SaaS application for AI Security Posture Management (AI-SPM). It provides comprehensive security monitoring and management for AI models and cloud environments. The platform detects security risks, manages cloud integrations, and offers detailed management screens, aiming to establish itself as a leader in AI security solutions.

Key Capabilities:
- Monitors AI models and cloud resources for security vulnerabilities.
- Provides an interactive Security Graph for visualizing cloud environment relationships and risks.
- Offers a robust policy engine with 173 detection policies across 16 categories, including specialized AI security rules, Bedrock custom model checks, SageMaker lifecycle policies, Azure AI-SPM (AZ-AI), GCP AI-SPM (GC-AI), Hugging Face (HF), and infrastructure coverage.
- Integrates with AWS, Azure, GCP, and Hugging Face for asset discovery and scanning across various AI services and model registries.
- Features role-based access control (RBAC) and superadmin capabilities for platform management.
- Includes a Hex Scanner integration for deep AI model artifact analysis.
- Provides real-time notifications and detailed finding remediation suggestions.

## User Preferences
- Brand color: Blue (#007aff), hover: #0066d6, lime accent: #A6E247
- Typography: Nunito Sans everywhere (both UI and mono/data)
- Glassmorphism effects in both light and dark themes
- "Sapphire Future" dark theme, "Clean Future" light theme

## System Architecture
The platform is built with a modern web stack:
- **Frontend**: React, Vite, Tailwind CSS v4, shadcn/ui components, TanStack Query for state management, wouter for routing, next-themes for theming.
- **Backend**: Express.js with RESTful API routes.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Session-based authentication using `express-session` and a PostgreSQL session store, `bcryptjs` for password hashing, `otpauth` for TOTP MFA, and API key authentication via `Authorization: Bearer fyx_...` headers. Password complexity enforced via shared `passwordSchema` (min 8 chars, uppercase, lowercase, number, special character). Email verification required before login — unverified users are blocked at login with option to resend verification email.
- **Cloud Integration**: Multi-cloud support — AWS (`@aws-sdk`), Azure (`@azure/identity`, `@azure/arm-machinelearning`, `@azure/arm-cognitiveservices`, `@azure/arm-search`, `@azure/arm-resources`), GCP (`google-auth-library` with Vertex AI REST API), and Hugging Face (REST API with Bearer token).
- **Security**: AES-256-GCM encryption for sensitive credential storage, Helmet for security headers, rate limiting on auth endpoints, response compression (gzip/brotli), WebSocket heartbeat for stale connection cleanup, graceful server shutdown, request ID tracking.
- **Database Indexes**: Optimized indexes on resources(org_id, project_id), policy_findings(severity, status), cloud_connectors(org_id, provider), users(email), users(org_id), ai_models(org_id, project_id), notifications(user_id, org_id), projects(org_id).
- **Core Features**:
    - **Security Graph**: Interactive visualization using `@xyflow/react` with dagre layout for cloud assets and relationships, including risk indicators and filtering.
    - **Policy Engine**: A comprehensive engine with 173 detection policies across 16 categories (including BCM — Bedrock Custom Model, SM — SageMaker Lifecycle, AZ-AI — Azure AI-SPM, GC-AI — GCP AI-SPM, HF — Hugging Face), capable of evaluating assets and generating detailed findings with impact, remediation, and evidence. Custom Model scanner enriches with GetCustomModel + GetModelCustomizationJob for encryption/VPC metadata.
    - **Hex Scanner Integration**: Automated deep scanning of AI model artifacts in S3 buckets using a `layerd/hex` Docker container, converting scan results into policy findings.
    - **Auto-Discovery**: A background scheduler for continuous scanning and discovery of AWS, Azure, and GCP resources.
    - **Project-Scoped Data**: All major pages (dashboard, inventory, findings, connectors, security graph, models, policies) support project-level filtering via `useProject()` context hook with localStorage persistence. Backend endpoints accept `?projectId=` query parameter and storage methods combine `orgId` + `projectId` filters. Policy engine enriches findings with `projectId` from the source asset.
    - **RBAC System**: Granular, permission-based access control with 5 distinct roles and project-level scoping.
    - **Superadmin System**: Provides cross-organization management capabilities and user impersonation for administrative oversight.
    - **Real-time Notifications**: WebSocket-based notifications for critical policy violations.
    - **Asset Inventory**: Unified view of all discovered assets with category-based filtering and risk breakdowns.
    - **Remediation Engine**: Generates automated, actionable remediation scripts (AWS CLI, IAM Policy JSON, Terraform, Python) for detected findings.
    - **Licensing System**: 7-day free trial auto-assigned on signup; paid/enterprise licenses managed by superadmin with custom limits (assets, models, connectors, users, policies, projects); expired licenses redirect non-superadmin users to a license-expired page.
    - **Subscription System**: Unit-based billing via standalone Stripe (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars). Plans: Free (100 units/$0), Starter (500/$99/mo), Professional (5K/$499/mo), Enterprise (50K/$1,499/mo). 1 unit = 1 cloud asset or 1 HF repo. Monthly/annual billing with 17% annual discount. Self-service via Stripe Checkout + Customer Portal. Superadmin can grant/override subscriptions. Billing page at `/billing`, pricing section on landing page. Verify-checkout fallback syncs subscriptions from Stripe when webhooks are not configured.
    - **License Enforcement**: All plan limits are enforced server-side before resource creation: connectors (maxConnectors), users (maxUsers), projects (maxProjects), assets (maxAssets), models (maxModels), repo scans (maxRepoScans). Connector sync and auto-discovery cap ingestion at plan limits, only counting net-new records (upserts that update existing records don't count). Repo scans count AI models linked to Hugging Face connectors specifically; enforced during HF connector sync and auto-discovery. Notifications are sent to all org users when any limit reaches 80% (approaching) or 100% (at limit), and when sync skips assets/models/repo-scans due to plan limits. The `/api/billing/usage` endpoint returns per-category limit details (assets, models, repoScans, connectors, users, projects, policies). orgId is always server-enforced on create endpoints to prevent cross-tenant writes.
    - **Email Verification**: SMTP-based email verification on signup, configurable from the superadmin SMTP tab.
    - **API Keys**: User-managed API keys with granular permissions and interactive API documentation page.
    - **Audit Log**: Tracks all system changes and user actions (login, password changes, MFA changes, user management, connector operations, policy scans, org settings updates). Stored in `audit_logs` table with user, action, category, target, details, IP, and user agent. Paginated viewer at `/audit-logs` with category filtering, search, and CSV export.
    - **Documentation**: In-app documentation with contextual help icons linking to specific sections.
    - **Landing Pages**: Public pages (landing, features, pricing, trust, architecture, resources) use white/light theme with blue (#007aff) accent, 14px base font, Rubik. Features at `/features`, Pricing at `/pricing`, Trust & Security at `/trust`, Architecture at `/architecture`, Resources at `/resources`.

## External Dependencies
- **AWS SDK**: For integration with AWS services (SageMaker, Bedrock, Lambda, S3, STS, OpenSearch Serverless, Secrets Manager, Parameter Store, IAM, CloudWatch Logs, CloudTrail, Step Functions, SageMaker Pipelines/Feature Store, Bedrock Guardrails, Bedrock Flows/Prompts, Glue, AppFlow, Lex, Kendra, Neptune, RDS/Aurora).
- **Azure SDK**: `@azure/identity`, `@azure/arm-machinelearning`, `@azure/arm-cognitiveservices`, `@azure/arm-search`, `@azure/arm-resources` for Azure ML, Cognitive Services (incl. OpenAI), and AI Search scanning.
- **GCP SDK**: `google-auth-library` for authentication + Vertex AI REST API for endpoints, models, datasets, and pipelines scanning.
- **PostgreSQL**: Primary database for data storage.
- **Drizzle ORM**: Object-Relational Mapper for database interactions.
- **@xyflow/react**: For building the interactive Security Graph UI.
- **otpauth**: For handling TOTP Multi-Factor Authentication.
- **layerd/hex**: Docker container for deep AI model security scanning.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Component library for UI elements.
- **TanStack Query**: For server state management in the frontend.
- **wouter**: A tiny routing library for React.
- **next-themes**: For managing dark/light mode themes.
- **bcryptjs**: For password hashing.
- **express-session**: Session management middleware for Express.js.
- **stripe**: Standalone Stripe SDK for subscription billing (checkout, customer portal, webhooks).