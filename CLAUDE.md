- no need to run server like npm run dev or anything. i will do it manually
- use agents for everything if applicable

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# UI/UX Guidelines & Important Behaviors

## Design System
- **Theme**: Gothic dark theme with card-based design
- **Colors**:
  - Background: gothic-900 (darkest)
  - Cards: gothic-800 with gothic-700 borders
  - Text: gothic-100 (titles), gothic-300 (content), gothic-400 (subtle)
  - Accent: accent-400/500 (primary actions)
  - Status colors: yellow (draft), blue (submitted), green (resolved), red (problem)
- **Components**: All use `gothic-card` class, mobile-first responsive design
- **Font sizes**: text-xs for most content, text-sm for headers
- **Buttons**: btn-primary (accent), btn-secondary (gothic), btn-danger (red)

## Report System Behavior
1. **Auto-save drafts**: When creating new report, automatically save as draft first
2. **Draft selection**: Show modal to choose between existing draft or create new
3. **Cancel behavior**: When canceling draft selection, redirect to dashboard
4. **Photo requirements**:
   - Auto-upload on selection
   - Visual feedback when requirements met (green background)
   - Disable submit until photo requirements satisfied
5. **Checklist requirements**:
   - Click entire item to toggle (not just checkbox)
   - Visual feedback when all required items complete
   - Show count in header (e.g., "Checklist Items (5/7)")
6. **Problem reports priority**:
   - Unresolved problems always sort first in lists
   - Highlight with red border and subtle pulse animation
   - Resolution popup required before marking as resolved
7. **Report list visual cues**:
   - Color-coded left borders (no status chips)
   - Date dividers for grouping
   - Unresolved problems highlighted with red glow

## Navigation Patterns
- Bottom navigation hidden on `/reports/create` pages
- Floating action buttons (FAB) with background container on create/edit pages
- Back navigation in header for detail/create pages
- Admin badge shown consistently in header-actions div (not inline with title)
- "View All" links use arrow style (→) not buttons

## Form Validation
- Title required for all reports
- Checklists required for OPENING/CLOSING reports
- Photo requirements vary by category (minRequired/maxAllowed)
- Submit button disabled until all requirements met
- Type field not sent on PATCH requests (only on POST)

## API Patterns
- JWT tokens in Authorization header
- Refresh token mechanism for expired tokens
- Photo serving requires authentication (`/api/photos/file/:reportId/:filename`)
- Resolution data sent as object: `{ resolution: string }`
- Draft reports can be edited before submission

## State Management
- Local state for unsaved checklist items (works without draft)
- Photo uploads stored with File objects, not base64
- Authentication context provides user, isAdmin, isAuthenticated
- Toast notifications for all CRUD operations

## Common Fixes Applied
- Infinite loops: Remove callbacks from useEffect dependencies
- Photo categories: Use minRequired/maxAllowed (not minPhotos/maxPhotos)
- File paths: Use path.resolve for photo serving
- Route ordering: Specific routes before generic ones
- Form data: Use FormData for file uploads, not JSON
- Double API paths: Check for /api/api in URLs

## Testing & Development
- No auto-run of dev server (user runs manually)
- Use agents for complex tasks when applicable
- Check existing components before creating new ones
- Follow existing code conventions and patterns
- Always verify authentication state before operations

# PROJECT OVERVIEW: Business Reporting Application

## Tech Stack
**Frontend:**
- Next.js 14.0.4 with App Router
- React 18.2.0 with TypeScript
- Tailwind CSS for styling
- Axios for API calls
- React Hook Form for forms
- Lucide React icons

**Backend:**
- Express.js server
- Prisma ORM with SQLite database
- JWT authentication with bcrypt
- Joi for validation
- Multer for file uploads

## Database Models (Prisma)
- **User**: Authentication, roles (USER/ADMIN)
- **Report**: Types (OPENING/CLOSING/PROBLEM/STOCK), status tracking
- **ReportPhoto**: Photo uploads with metadata
- **PhotoCategory**: Min/max photo requirements per category
- **ChecklistTemplate**: Reusable checklists for reports
- **ReportChecklist**: Links reports to checklists
- **StockReport**: Stock quantity tracking

## API Structure
- `/api/auth/*`: Login, register, refresh, logout, verify
- `/api/reports/*`: Report CRUD operations
- `/api/photos/*`: Photo upload/management
- `/api/admin/*`: Admin operations
- All routes require JWT authentication except login/register

## Frontend Pages (App Router)
- `/` - Home
- `/login` - Authentication
- `/dashboard` - Main dashboard
- `/profile` - User profile
- `/reports/*` - Report management (create, edit, view)
- `/admin/*` - Admin panels (users, checklists, settings, photo categories)

## Key Features
- Multiple report types with different workflows
- Photo documentation with category constraints
- Checklist templates for structured reporting
- Stock tracking capabilities
- Role-based access control
- JWT token refresh mechanism