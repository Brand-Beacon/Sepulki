# Logout Functionality Implementation

Complete logout functionality for the Sepulki application with desktop and mobile support.

## 📋 Overview

The logout implementation provides:
- **Clean, accessible logout buttons** with multiple variants
- **Confirmation dialogs** for safe signout
- **Loading states** during the signout process
- **Error handling** with graceful fallbacks
- **Mobile-responsive** design
- **Desktop dropdown menu** with user profile
- **Integration** with local-auth service

## 🎯 Components

### 1. LogoutButton Component

**Location**: `/apps/forge-ui/src/components/LogoutButton.tsx`

A flexible logout button component with three variants:

#### Variants

**Default Variant** - Full button with icon and text
```tsx
<LogoutButton />
```

**Menu Variant** - For dropdown menus
```tsx
<LogoutButton variant="menu" />
```

**Icon Variant** - Icon-only for compact spaces
```tsx
<LogoutButton variant="icon" />
```

#### Props

```tsx
interface LogoutButtonProps {
  variant?: 'default' | 'menu' | 'icon';
  showConfirmation?: boolean;  // Show confirmation dialog
  className?: string;           // Additional CSS classes
}
```

#### Features

- **Loading State**: Shows spinner and "Signing Out..." text during signout
- **Confirmation Dialog**: Optional confirmation before signing out
- **Accessible**: Full ARIA labels and keyboard navigation
- **Error Handling**: Gracefully handles signout failures
- **Disabled State**: Button disabled during loading

### 2. UserMenu Component

**Location**: `/apps/forge-ui/src/components/UserMenu.tsx`

A dropdown menu for authenticated users with profile information and navigation.

#### Features

- **User Avatar**: Shows profile image or initials
- **User Info**: Displays name, email, and role
- **Navigation Links**:
  - My Designs
  - Settings
  - Help & Support
- **Logout Option**: Integrated LogoutButton with confirmation
- **Responsive**: Desktop only (hidden on mobile)
- **Loading State**: Skeleton loader during auth check

### 3. MobileMenu Component

**Location**: `/apps/forge-ui/src/components/MobileMenu.tsx`

A slide-out mobile menu with navigation and logout.

#### Features

- **Hamburger Menu**: Icon button to open menu
- **Slide-in Panel**: Smooth animation from right
- **User Profile**: Shows avatar and info at top
- **Navigation**: All accessible routes with icons
- **Logout Button**: Full-width button at bottom
- **Backdrop**: Semi-transparent overlay
- **Accessible**: Focus management and escape key support

### 4. Enhanced AuthProvider

**Location**: `/apps/forge-ui/src/components/AuthProvider.tsx`

Updated authentication provider with improved signout handling.

#### Improvements

- **Better Error Handling**: Try-catch blocks with fallbacks
- **Proper HTTP Calls**: Includes Content-Type headers
- **Status Checking**: Validates response status
- **Graceful Degradation**: Works even if service is down
- **Logging**: Clear console messages for debugging
- **State Cleanup**: Always clears client state

## 🚀 Integration

### Layout Integration

**Location**: `/apps/forge-ui/src/app/layout.tsx`

The main layout now includes:

```tsx
<div className="flex items-center space-x-4">
  <SmithProfile />
  <div className="hidden sm:block">
    <UserMenu />
  </div>
  <MobileMenu />
</div>
```

- **Desktop**: UserMenu shows on screens ≥ 640px
- **Mobile**: MobileMenu always visible, opens slide-out panel

## 🔌 API Integration

### Local Auth Service

**Endpoint**: `POST http://localhost:4446/auth/signout`

**Location**: `/services/local-auth/src/index.ts` (line 379)

#### Request
```javascript
fetch('http://localhost:4446/auth/signout', {
  method: 'POST',
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json',
  },
})
```

#### Response
```json
{
  "success": true,
  "url": "http://localhost:3000"
}
```

#### Functionality
1. Reads session token from `next-auth.session-token` cookie
2. Deletes session from Redis: `session:${sessionToken}`
3. Clears the session cookie
4. Returns success response

## 🎨 Styling

All components use:
- **Tailwind CSS** for styling
- **Headless UI** for accessible dropdowns and dialogs
- **Lucide React** for icons
- **Consistent color scheme**: Orange primary, Gray neutrals

### Design Patterns

- **Orange-600**: Primary actions and branding
- **Gray-600**: Secondary actions (logout buttons)
- **Hover States**: All interactive elements have hover effects
- **Focus States**: Visible focus rings for accessibility
- **Transitions**: Smooth animations (200-300ms)

## 🧪 Testing

### Test Files

1. **LogoutButton Tests**: `/apps/forge-ui/src/components/__tests__/LogoutButton.test.tsx`
   - Default variant behavior
   - Menu variant behavior
   - Icon variant behavior
   - Confirmation dialog
   - Loading states
   - Error handling

2. **UserMenu Tests**: `/apps/forge-ui/src/components/__tests__/UserMenu.test.tsx`
   - Loading state
   - Unauthenticated state
   - Menu rendering
   - Navigation links
   - User info display

### Running Tests

```bash
cd apps/forge-ui
npm test -- LogoutButton.test.tsx
npm test -- UserMenu.test.tsx
```

## 📱 Responsive Design

### Desktop (≥ 640px)

```
┌─────────────────────────────────────┐
│ Sepulki  Fleet  Floors  Design      │
│                    [User Menu ▼]    │
└─────────────────────────────────────┘
```

- UserMenu dropdown in top-right
- Full navigation visible
- Hover interactions

### Mobile (< 640px)

```
┌─────────────────────────────────────┐
│ Sepulki                    [☰]      │
└─────────────────────────────────────┘
```

- Hamburger menu opens slide-out panel
- All navigation items with icons
- User profile at top
- Logout button at bottom

## 🔐 Security

### Client-Side
- Clears smith state immediately
- Updates global auth state
- Prevents reuse of stale session data

### Server-Side
- Deletes session from Redis
- Clears session cookie
- No residual authentication tokens

## 🎯 User Experience

### Confirmation Flow

1. User clicks logout button
2. Confirmation dialog appears (if enabled)
3. User confirms or cancels
4. Loading state shows during signout
5. Redirect to signin page

### Error Handling

If signout fails:
1. Error logged to console
2. Client state still cleared
3. User redirected to signin
4. Can sign in again to restore session

## 🚀 Future Enhancements

### Optional Features

1. **Keyboard Shortcut**: Add Cmd+Shift+Q for quick logout
2. **Session Timeout**: Auto-logout after inactivity
3. **Multi-Device Logout**: Sign out all sessions
4. **Remember Me**: Optional persistent sessions
5. **Analytics**: Track logout events

### Implementation Example - Keyboard Shortcut

```tsx
// In layout or global component
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'q') {
      e.preventDefault();
      signOut();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [signOut]);
```

## 📚 Usage Examples

### Basic Logout Button

```tsx
import { LogoutButton } from '@/components/LogoutButton';

function Header() {
  return (
    <div>
      <LogoutButton />
    </div>
  );
}
```

### With Confirmation

```tsx
<LogoutButton showConfirmation />
```

### In a Custom Menu

```tsx
import { Menu } from '@headlessui/react';
import { LogoutButton } from '@/components/LogoutButton';

function CustomMenu() {
  return (
    <Menu>
      <Menu.Items>
        <Menu.Item>
          <LogoutButton variant="menu" showConfirmation />
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
```

### Icon Only

```tsx
<LogoutButton variant="icon" className="ml-2" />
```

## 🐛 Troubleshooting

### Issue: Logout button not visible

**Solution**: Check if smith is authenticated
```tsx
const { smith } = useAuth();
// LogoutButton only shows when smith is not null
```

### Issue: Confirmation dialog doesn't appear

**Solution**: Add showConfirmation prop
```tsx
<LogoutButton showConfirmation />
```

### Issue: Signout fails with network error

**Solution**: Check if local-auth service is running
```bash
# In services/local-auth
npm start
```

### Issue: User not redirected after logout

**Solution**: Check AuthProvider signOut implementation
- Should always call `router.push('/auth/signin')`
- Check for errors in console

## 📝 Notes

- **Cookie Sharing**: Uses hostname-aware URLs for proper cookie sharing
- **Multiple Environments**: Works in both development (mock auth) and production (real auth)
- **State Management**: Uses React Context for global auth state
- **No External Auth**: Currently uses local-auth service, not next-auth
- **Testing**: Mock useAuth hook in tests to avoid dependencies

## 🎓 Code Quality

### TypeScript

All components are fully typed with:
- Props interfaces
- Return types
- Event handlers
- State types

### Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management in dialogs
- Screen reader friendly text

### Performance

- Lazy loading for icons
- Optimized re-renders with useCallback
- Minimal bundle impact (~5KB total)

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
