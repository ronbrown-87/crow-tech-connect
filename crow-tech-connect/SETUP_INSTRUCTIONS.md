# CrowTech Connect - Setup Instructions

## Overview

CrowTech Connect is a service marketplace platform connecting clients with service providers for construction, plumbing, electrical, and other home services. The platform includes role-based access control with clients, service providers, and administrators.

## Features

### 1. User Roles
- **Client**: Can request services, view their requests, mark as finished, and delete requests
- **Service Provider**: Can view matching service requests, accept requests, manage jobs, and contact clients
- **Admin**: Can approve/reject service provider applications, view platform statistics

### 2. Request Management
- **Service Provider Visibility**: Requests only appear to providers who offer the matching service category
- **Request Format**: "User [Full Name] needs help with [Service Name]"
- **Request Lifecycle**: Clients can mark requests as finished or delete them
- **Real-time Updates**: Status changes update on refresh

### 3. Admin Approval System
- Service providers cannot log in until approved by admin
- Admin dashboard shows only service provider approvals
- Approval status stored in database

## Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and authentication)
- Git (optional, for version control)

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd crow-tech-connect
```

### 2. Install Dependencies

```bash
# Install all required dependencies
npm install
```

### 3. Supabase Setup

#### 3.1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

#### 3.2. Configure Environment Variables

Update `src/integrations/supabase/client.ts` with your Supabase credentials:

```typescript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Or create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 3.3. Run Database Migrations

All migrations are located in `supabase/migrations/`. The migrations should be run in order:

```bash
# Using Supabase CLI (recommended)
supabase db reset

# Or manually run migrations through Supabase dashboard
# Navigate to SQL Editor and run each migration file in order
```

**Important Migrations:**
1. `20250819082338_1c6b2784-c845-4358-9029-60520bf314f4.sql` - Initial schema
2. `20260104000000_update_rls_policies.sql` - Updated RLS policies for proper access control
3. All other migrations in chronological order

#### 3.4. Create Admin User

After running migrations, create an admin user manually in Supabase:

```sql
-- First, create the auth user (through Supabase Auth or SQL Editor)
-- Then update the profile:
UPDATE profiles 
SET user_type = 'admin', approval_status = 'approved'
WHERE email = 'your-admin-email@example.com';
```

Or create directly via Supabase Auth dashboard with user metadata:
```json
{
  "user_type": "admin",
  "full_name": "Admin User"
}
```

### 4. Start Development Server

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal)

## Project Structure

```
crow-tech-connect/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AdminDashboard.tsx      # Admin approval dashboard
│   │   │   ├── ClientDashboard.tsx     # Client request management
│   │   │   └── ServiceProviderDashboard.tsx  # Provider job management
│   │   ├── ServiceRequestForm.tsx      # Form to create requests
│   │   └── ui/                         # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx             # Authentication context
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts               # Supabase client configuration
│   │       └── types.ts                # Database types
│   ├── pages/
│   │   ├── Auth.tsx                    # Login/signup page
│   │   └── Dashboard.tsx               # Dashboard router
│   └── lib/
│       └── validations.ts              # Zod validation schemas
├── supabase/
│   └── migrations/                     # Database migrations
└── package.json
```

## Key Features Implementation

### 1. Service Provider Request Filtering

**Location**: `src/components/dashboard/ServiceProviderDashboard.tsx`

Requests are filtered by matching service categories:
- Service requests have a `service_id` that links to `services` table
- `services` table has a `category` field
- `service_providers` table has `service_categories` array
- Only requests where `service.category` matches one of `service_provider.service_categories` are shown

### 2. Request Card Format

**Location**: `src/components/dashboard/ServiceProviderDashboard.tsx` (line ~310)

Request cards display: "User [Full Name] needs help with [Service Name]"

### 3. Client Request Management

**Location**: `src/components/dashboard/ClientDashboard.tsx`

Clients can:
- Mark requests as finished (updates status to 'completed')
- Delete requests (only pending or cancelled requests can be deleted)

### 4. Admin Approval System

**Location**: `src/components/dashboard/AdminDashboard.tsx`

Admin dashboard:
- Shows only service providers with `approval_status = 'pending'`
- Allows approve/reject actions
- Filters by `user_type = 'service_provider'`

### 5. Service Provider Lockout

**Location**: `src/contexts/AuthContext.tsx` (signIn function)

Service providers are locked out until:
- Email is confirmed (`email_confirmed_at` is set)
- Admin approval status is `'approved'`

## Database Schema

### Key Tables

1. **profiles**: User profiles with approval status
   - `user_type`: 'client' | 'service_provider' | 'admin'
   - `approval_status`: 'pending' | 'approved' | 'rejected'

2. **service_providers**: Service provider business information
   - `service_categories`: Array of service categories offered
   - `profile_id`: Links to profiles table

3. **services**: Available services
   - `category`: Service category enum
   - `name`: Service name

4. **service_requests**: Service requests
   - `client_id`: Links to profiles
   - `service_id`: Links to services
   - `service_provider_id`: Links to service_providers (nullable)
   - `status`: Request status enum

## Row Level Security (RLS) Policies

### Service Providers
- Can view pending requests matching their service categories
- Can view client profiles for requests they can respond to
- Can view and update requests assigned to them

### Clients
- Can manage (view, update, delete) their own requests
- Can create new service requests

### Admins
- Can view all profiles
- Can update approval status
- Can view all statistics

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Testing Checklist

### Client Flow
- [ ] Sign up as client
- [ ] Create service request
- [ ] View requests in dashboard
- [ ] Mark request as finished
- [ ] Delete pending request

### Service Provider Flow
- [ ] Sign up as service provider (should show pending approval)
- [ ] Cannot log in until approved
- [ ] After approval, can log in
- [ ] View only matching service requests
- [ ] See "User [Name] needs help with [Service]" format
- [ ] View client profile
- [ ] Contact client via email
- [ ] Accept request (status changes to 'assigned')
- [ ] Update job status

### Admin Flow
- [ ] Log in as admin
- [ ] View pending service provider approvals
- [ ] Approve service provider
- [ ] Reject service provider
- [ ] View dashboard statistics

## Common Issues & Solutions

### Issue: Service providers can't see any requests
**Solution**: 
- Ensure service provider has `service_categories` set
- Verify service request has matching category
- Check RLS policies are applied correctly

### Issue: Admin can't approve providers
**Solution**:
- Verify admin user has `user_type = 'admin'`
- Check RLS policies allow admin updates
- Ensure migration `20260104000000_update_rls_policies.sql` is run

### Issue: Requests not showing proper format
**Solution**:
- Verify request includes `profiles(full_name, email)` in query
- Check ServiceProviderDashboard component line ~310

### Issue: Email contact not working
**Solution**:
- Ensure `mailto:` links are working in browser
- Verify client profile has email address set

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Approval System**: Service providers cannot access platform until approved
3. **Role-Based Access**: Different dashboards based on user type
4. **Data Privacy**: Client profiles only visible to providers for matching requests

## Future Improvements

1. Real-time updates using Supabase Realtime
2. Notification system for status changes
3. Email notifications for approvals
4. Service provider profile pages
5. Review and rating system
6. Payment integration
7. In-app messaging system

## Support

For issues or questions:
- Check Supabase dashboard logs
- Review browser console for errors
- Verify database migrations are applied
- Check RLS policies in Supabase dashboard

## License

[Your License Here]
