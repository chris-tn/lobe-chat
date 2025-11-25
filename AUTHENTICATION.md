# DxAi Authentication Setup

DxAi yêu cầu authentication để truy cập vào `/chat` và các routes được bảo vệ khác.

## Protected Routes

Các routes sau yêu cầu authentication:

- `/chat` - Chat interface (DxAi)
- `/settings` - Settings page
- `/files` - File management
- `/onboard` - Onboarding process
- `/discover` - Discover page
- `/image` - Image generation

## Authentication Methods

DxAi hỗ trợ 2 phương thức authentication chính:

### 1. NextAuth (Recommended)

NextAuth hỗ trợ nhiều SSO providers như Auth0, GitHub, Azure AD, Keycloak, Casdoor, etc.

#### Cấu hình NextAuth:

```bash
# Enable NextAuth
NEXT_PUBLIC_ENABLE_NEXT_AUTH=1

# NextAuth Secret (generate với: openssl rand -base64 32)
NEXT_AUTH_SECRET=your-secret-key-here

# SSO Providers (comma-separated)
NEXT_AUTH_SSO_PROVIDERS=auth0,github

# Auth0 Configuration
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_ISSUER=https://your-tenant.auth0.com

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Keycloak Configuration
AUTH_KEYCLOAK_ID=your-keycloak-client-id
AUTH_KEYCLOAK_SECRET=your-keycloak-client-secret
AUTH_KEYCLOAK_ISSUER=https://your-keycloak-server.com/realms/your-realm-name
```

**Lưu ý**: Để sử dụng Keycloak, bạn cần thêm `keycloak` vào `NEXT_AUTH_SSO_PROVIDERS`. Ví dụ:

```bash
NEXT_AUTH_SSO_PROVIDERS=casdoor,keycloak
```

#### Cấu hình Keycloak:

1. **Tạo Realm và Client trong Keycloak**:
   - Đăng nhập vào Keycloak Admin Console
   - Tạo một Realm mới (hoặc sử dụng realm mặc định `master`)
   - Tạo một Client với:
     - Client ID: `your-keycloak-client-id`
     - Client Protocol: `openid-connect`
     - Access Type: `confidential` (hoặc `public` tùy use case)
     - Valid Redirect URIs: `https://your-domain.com/api/auth/callback/keycloak`

2. **Lấy Client Secret**:
   - Vào tab "Credentials" của client vừa tạo
   - Copy "Secret" value → đây là `AUTH_KEYCLOAK_SECRET`

3. **Xác định Issuer URL**:
   - Format: `https://your-keycloak-server.com/realms/{realm-name}`
   - Ví dụ: `https://keycloak.example.com/realms/my-realm`

4. **Cấu hình Environment Variables**:

```bash
NEXT_PUBLIC_ENABLE_NEXT_AUTH=1
NEXT_AUTH_SECRET=your-nextauth-secret
NEXT_AUTH_SSO_PROVIDERS=keycloak
AUTH_KEYCLOAK_ID=your-keycloak-client-id
AUTH_KEYCLOAK_SECRET=your-keycloak-client-secret
AUTH_KEYCLOAK_ISSUER=https://your-keycloak-server.com/realms/your-realm-name
```

5. **Sử dụng cùng với các providers khác**:
   - Bạn có thể sử dụng Keycloak cùng với Casdoor, Auth0, GitHub, etc.
   - Chỉ cần thêm `keycloak` vào danh sách providers: `NEXT_AUTH_SSO_PROVIDERS=casdoor,keycloak,auth0`

### 2. Clerk

Clerk cung cấp authentication service đầy đủ với UI components.

#### Cấu hình Clerk:

```bash
# Enable Clerk
NEXT_PUBLIC_ENABLE_CLERK_AUTH=1

# Clerk Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Webhook Secret (optional)
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

## Database Authentication

Nếu sử dụng database authentication (server mode):

```bash
# Enable server service
NEXT_PUBLIC_ENABLED_SERVER_SERVICE=1

# Database URL
DATABASE_URL=postgresql://user:password@host:port/database

# Auth session strategy (jwt or database)
NEXT_AUTH_SSO_SESSION_STRATEGY=database
```

## Access Code (Simple Protection)

Nếu chỉ cần bảo vệ đơn giản không dùng SSO:

```bash
# Set access codes (comma-separated for multiple codes)
ACCESS_CODE=your-secret-code-1,your-secret-code-2
```

## Enable Full Auth Protection

Để bảo vệ TẤT CẢ routes (trừ public routes):

```bash
ENABLE_AUTH_PROTECTION=1
```

Khi enable flag này:

- Tất cả routes sẽ yêu cầu authentication
- Chỉ các public routes (API, webhooks, login pages) là accessible

## Docker Compose Example

```yaml
version: '3.8'
services:
  lobe:
    image: dxai:latest
    environment:
      # OpenAI
      - OPENAI_API_KEY=sk-xxxxx

      # NextAuth
      - NEXT_PUBLIC_ENABLE_NEXT_AUTH=1
      - NEXT_AUTH_SECRET=your-secret-key
      - AUTH0_CLIENT_ID=your-auth0-client-id
      - AUTH0_CLIENT_SECRET=your-auth0-client-secret
      - AUTH0_ISSUER=https://your-tenant.auth0.com

      # Database
      - DATABASE_URL=postgresql://user:password@postgres:5432/dxai

      # Protected Routes
      - ENABLE_AUTH_PROTECTION=0
```

## Login URLs

- NextAuth: `https://your-domain.com/next-auth/signin`
- Clerk: `https://your-domain.com/login`

## Testing Authentication

1. Start DxAi với auth config
2. Truy cập `http://localhost:3210/chat`
3. Bạn sẽ được redirect đến login page
4. Sau khi login thành công, redirect về `/chat`

## Troubleshooting

### "Unauthorized" error

- Kiểm tra `NEXT_AUTH_SECRET` đã được set
- Verify SSO provider credentials
- Check database connection nếu dùng database session

### Redirect loop

- Clear browser cookies
- Kiểm tra `APP_URL` environment variable
- Verify callback URLs trong SSO provider settings

### Session không persist

- Kiểm tra `NEXT_AUTH_SSO_SESSION_STRATEGY` (jwt vs database)
- Verify database migrations đã chạy
- Check session cookie settings

## Security Notes

1. **HTTPS Required**: Production phải dùng HTTPS
2. **Secret Key**: Generate random secret key, không dùng default
3. **Database**: Encrypt database connection nếu external
4. **Callbacks**: Whitelist callback URLs trong SSO providers
5. **CORS**: Configure proper CORS settings nếu frontend/backend riêng biệt

## Additional Resources

- [NextAuth Documentation](https://authjs.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [LobeChat Auth Guide](https://lobehub.com/docs/self-hosting/advanced/authentication)
