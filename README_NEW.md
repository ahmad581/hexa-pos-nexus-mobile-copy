# Hexa Business Kit Mobile

A comprehensive React Native mobile application for managing business operations on the go. Hexa Business Kit is the mobile companion to the Hexa Business Kit system, providing seamless access to business management features from your mobile device.

## Overview

Hexa Business Kit Mobile is built with modern technologies to deliver a responsive, real-time experience for business managers, employees, and administrators:

- **Frontend**: React Native, TypeScript, React Navigation
- **Backend**: Supabase (PostgreSQL database, Authentication, Edge Functions)
- **State Management**: TanStack Query, React Context
- **Testing**: Jest, TypeScript

### Key Features

- 🔐 **Multi-tenant Authentication** - Secure login with Supabase Auth
- 👥 **Role-Based Access Control** - SystemMaster, SuperManager, Manager, HR Manager, Hall Manager, Call Center, Cashier, Employee roles
- 🏢 **Multi-Business Support** - Manage multiple businesses and branches
- 📱 **Real-time Updates** - Live data synchronization via Supabase Realtime
- 💼 **Employee Management** - Manage employees, roles, and permissions
- 🏦 **Loan Management** - Employee loan applications with approval workflows
- 📞 **Call Center Integration** - Twilio-powered call management (for applicable users)
- 📊 **Analytics & Reporting** - Business insights and performance metrics
- 🔔 **Notifications** - Real-time alerts for critical business events
- 💾 **Data Backup** - Backup and export business data

## Project Structure

```
hexa-pos-nexus-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # App screens
│   ├── navigation/          # Navigation configuration
│   ├── services/            # API and business logic
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── theme/               # Theme configuration
│   ├── constants/           # App constants
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component
│   └── index.tsx            # Entry point
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
└── babel.config.js          # Babel configuration
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- React Native development environment set up
- Supabase project with appropriate tables and functions
- (Optional) Android Studio or Xcode for native development

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd hexa-pos-nexus-mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Supabase credentials**:
   Update `src/services/supabase.ts` with your Supabase project URL and anon key:
   ```typescript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

4. **Configure API base URL**:
   Update `src/constants/index.ts` with your API endpoint:
   ```typescript
   export const API_BASE_URL = 'https://your-api.com';
   ```

5. **Start the development server**:
   ```bash
   npm start
   ```

6. **Run on Android/iOS**:
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   ```

## API Service

The `ApiService` provides methods for making HTTP requests:

```typescript
import ApiService from './services/api';

// GET request
const data = await ApiService.get('/endpoint');

// POST request
const response = await ApiService.post('/endpoint', { data });

// PUT request
const updated = await ApiService.put('/endpoint', { data });

// PATCH request
const patched = await ApiService.patch('/endpoint', { data });
```

## Authentication

### Login Methods

1. **Standard Login** - Email and password authentication
2. **System Master Login** - Administrative access (requires primary_role = 'SystemMaster')

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Manager | manager@demo.com | demo123 |
| Manager | branch.manager@demo.com | demo123 |
| Cashier | cashier@demo.com | demo123 |
| Hall Manager | hall@demo.com | demo123 |
| HR Manager | hr@demo.com | demo123 |
| Call Center | callcenter@demo.com | demo123 |
| Employee | employee@demo.com | demo123 |

## User Roles

### Role Hierarchy

| Priority | Role | Description |
|----------|------|-------------|
| 0 | SystemMaster | Full system access, manages all clients |
| 1 | SuperManager | Full access to their business |
| 2 | Manager | Branch-level management |
| 3 | HrManager | Employee management and HR |
| 4 | HallManager | Floor/hall operations |
| 5 | CallCenterEmp | Call center operations |
| 6 | Cashier | Point of sale operations |
| 7 | Employee | Basic employee access |

## Key Sections

### 1. Dashboard
Access role-based dashboards with business metrics and quick actions:
- System Master Dashboard - Manage all clients and system settings
- SuperManager/Manager Dashboard - Business operations and analytics

### 2. Employee Management
- View and manage employee records
- Assign roles and permissions
- Track work sessions and attendance
- Calculate salaries with overtime support
- Upload and manage employee documents

### 3. Loan Management
- Configure loan settings per branch
- Apply for employee loans
- Approve/reject loan applications
- Track repayment progress
- Automatic calculation of monthly payments

### 4. Call Center (for Call Center Employees)
- Manage incoming call queue
- Answer and route calls
- Real-time call notifications
- Track session hours automatically
- Call history and recordings

### 5. Analytics & Reporting
- View business metrics and KPIs
- Generate reports
- Export data in multiple formats
- Business-type aware analytics

### 6. Notifications
- Real-time alerts for critical events
- Mark notifications as read
- Notification center with filtering
- Event types: Loan requests, backups, inventory, orders, system alerts

## Business Types

The system supports various business types with tailored features:

- 🍽️ Restaurant
- ☕ Café
- 🥐 Bakery
- ✂️ Salon
- 🧖 Spa
- 🏨 Hotel
- 🏪 Retail Store
- 🛒 Grocery Store
- 💊 Pharmacy
- 💪 Gym/Fitness
- 🐾 Pet Care
- 🔧 Auto Repair

## Services

### API Service (`src/services/api.ts`)
Handles all HTTP requests with error handling and logging.

### Supabase Service (`src/services/supabase.ts`)
Manages Supabase client initialization and database connections.

## Hooks

Custom hooks for common operations:
- `useAsync` - Handle async operations with loading and error states
- And more hooks available in `src/hooks/`

## Theme

The app uses a centralized theme configuration in `src/theme/`:
- Color schemes
- Typography
- Spacing
- Shadow effects
- Component styling

## Testing

Run tests with Jest:

```bash
npm test
npm test -- --coverage  # With coverage report
```

## Build

### Development Build
```bash
npm run start
```

### Production Build
```bash
npm run build
```

## Environment Variables

Create a `.env` file in the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
API_BASE_URL=https://your-api.com
```

## Security Considerations

- All sensitive data is stored securely via Supabase Auth
- Role-based access control is enforced at the database level (RLS)
- Sessions are persisted securely with auto-refresh
- Never expose Supabase admin keys in the app
- Always validate permissions on both client and server

## Troubleshooting

### Cannot find module errors
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall if issues persist: `rm -rf node_modules && npm install`
- Restart TypeScript server in VS Code

### Authentication issues
- Verify Supabase credentials in `src/services/supabase.ts`
- Check that user profile exists in the `profiles` table
- Ensure user's `is_active` status is true

### Real-time updates not working
- Verify Supabase Realtime is enabled for the required tables
- Check network connectivity
- Ensure proper JWT token is being used

### Navigation issues
- Clear app cache and restart
- Verify navigation configuration in `src/navigation/`

## Documentation

For comprehensive documentation on the Hexa Business Kit system features, see [DOCUMENTATION.md](./DOCUMENTATION.md) in the parent directory.

### Detailed Topics

- **Authentication & Login** - User authentication flows and session management
- **User Roles & Permissions** - Role hierarchy and permission matrix
- **Loan Management** - Employee loan system with approval workflows
- **Call Center System** - Twilio integration and call management
- **Employee Management** - Employee records, documents, and salary calculation
- **Notifications** - Real-time notification system and event triggers
- **Data Backup** - Business data backup and recovery
- **Database Schema** - Complete database structure and relationships
- **Security** - RLS policies and best practices

## Contributing

When contributing to this project:

1. Create a new branch for your feature
2. Follow TypeScript and React best practices
3. Write tests for new functionality
4. Update documentation as needed
5. Submit a pull request with a clear description

## License

[Your License Here]

## Support

For issues or questions:
- Check the [DOCUMENTATION.md](./DOCUMENTATION.md) for detailed information
- Review existing GitHub issues
- Contact the development team

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026 | Initial mobile app release |

---

**Hexa Business Kit Mobile** - Manage your business from anywhere, anytime.

*Last updated: April 2026*
