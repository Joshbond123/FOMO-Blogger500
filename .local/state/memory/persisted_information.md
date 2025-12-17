# Persisted State - X Cross-Posting Image Upload Fix

## Current Task
User wants X cross-posting to include images, not just text.

## What Was Fixed
1. **Tweet length issue** - Changed `maxLength` from 1000 to 280 in `formatBlogPostForX()` in `server/services/twitter.ts` (line ~274). This fixed the 403 permission errors.

2. **Added media upload function** - Added `uploadMediaToX()` function in `server/services/twitter.ts` that downloads images and uploads to X's media endpoint.

## Current Issue - Media Upload Auth Failing
The media upload is failing with error code 32 "Could not authenticate you".

**Root cause**: The X v1.1 media upload API requires OAuth 1.0a signature that includes body parameters (like `media_data`) in the signature calculation. Currently, the `generateAuthHeader()` function is not including the body parameters.

**Fix needed**: Modify the `generateAuthHeader()` call for media uploads to include the `media_data` parameter in the OAuth signature. The `additionalParams` parameter exists for this purpose but isn't being used.

## Files to Fix
- `server/services/twitter.ts` - Update `uploadMediaToX()` function around line 163-230

## Fix Implementation
In the `uploadMediaToX()` function, change:
```typescript
const authHeader = generateAuthHeader(
  "POST",
  uploadUrl,
  xAccount.apiKey,
  xAccount.apiSecret,
  xAccount.accessToken,
  xAccount.accessTokenSecret
);
```
To:
```typescript
const authHeader = generateAuthHeader(
  "POST",
  uploadUrl,
  xAccount.apiKey,
  xAccount.apiSecret,
  xAccount.accessToken,
  xAccount.accessTokenSecret,
  { media_data: base64Image }  // Include in OAuth signature
);
```

## X Account Details
- X Account ID: `44d10462-87c7-4bdd-b583-80f627e23536`
- Username: FactShockworld
- Blogger Account: ShadowCase Files (ID: `57c3e8ac-a36f-4901-8893-ee766b73cdcd`)
- Credentials are stored in `storage/x_accounts.json`
- Connections are in `database/x_connections.json`

## Test Command After Fix
```bash
curl -X POST http://localhost:5000/api/x/post/bc3893e5-7795-4f93-92ec-494a9b7600a6
```
Use a different post ID to avoid duplicate content error.

## Workflow
`npm run dev` runs both frontend and backend on port 5000.
