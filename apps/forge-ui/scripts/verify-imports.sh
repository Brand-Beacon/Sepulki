#!/bin/bash
# Verification script to check all Apollo Client imports are correct

set -e

echo "🔍 Verifying Apollo Client imports..."

ERRORS=0

# Check for incorrect React hook imports from main package
echo "Checking for incorrect useQuery/useMutation/useSubscription imports..."
INCORRECT=$(grep -r "from '@apollo/client'" src --include="*.ts" --include="*.tsx" | grep -E "useQuery|useMutation|useSubscription" | grep -v "gql\|ApolloClient\|createHttpLink\|InMemoryCache\|split\|setContext" || true)

if [ -n "$INCORRECT" ]; then
  echo "❌ Found incorrect imports:"
  echo "$INCORRECT"
  ERRORS=1
else
  echo "✅ All React hooks imported from correct package"
fi

# Verify React hooks are available from @apollo/client/react
echo "Verifying React hooks export..."
cd "$(dirname "$0")/.." && node -e "
try {
  const react = require('@apollo/client/react');
  const checks = {
    useQuery: typeof react.useQuery === 'function',
    useMutation: typeof react.useMutation === 'function',
    useSubscription: typeof react.useSubscription === 'function',
    ApolloProvider: typeof react.ApolloProvider === 'function'
  };
  
  const allGood = Object.values(checks).every(v => v === true);
  if (!allGood) {
    console.error('❌ Missing exports:', Object.entries(checks).filter(([_, v]) => !v).map(([k]) => k).join(', '));
    process.exit(1);
  }
  console.log('✅ All React hooks available from @apollo/client/react');
} catch(e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
"

# Check for ApolloProvider import
echo "Checking ApolloProvider import..."
APOLLO_PROVIDER_IMPORT=$(grep -r "ApolloProvider" src/components/ApolloProvider.tsx | grep "from '@apollo/client/react'" || true)
if [ -z "$APOLLO_PROVIDER_IMPORT" ]; then
  echo "❌ ApolloProvider not imported from @apollo/client/react"
  ERRORS=1
else
  echo "✅ ApolloProvider imported correctly"
fi

if [ $ERRORS -eq 0 ]; then
  echo ""
  echo "✅ All imports verified successfully!"
  exit 0
else
  echo ""
  echo "❌ Import verification failed"
  exit 1
fi

