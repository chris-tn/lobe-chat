# Kiến Trúc Hệ Thống DxAi

## Tổng Quan

DxAi là một nền tảng AI chat hiện đại, được xây dựng dựa trên LobeChat Community Edition. Hệ thống cung cấp trải nghiệm chat AI được tối ưu hóa với các AI assistant được định sẵn và các tính năng sẵn sàng cho doanh nghiệp.

## 1. Kiến Trúc Hệ Thống

### 1.1. Kiến Trúc Tổng Thể (High-Level Architecture)

DxAi được xây dựng theo kiến trúc **monorepo** với cấu trúc phân tầng rõ ràng:

#### Sơ Đồ Kiến Trúc High-Level

```mermaid
---
config:
  look: neo
  layout: elk
  theme: neutral
---
flowchart TB
 subgraph subGraph0["Client Layer"]
        WEB["Web App<br>Next.js 15 + React 19"]
        MOBILE["Mobile App<br>React Native<br>"]
  end
 subgraph subGraph1["API Layer"]
        TRPC["tRPC API<br>Type-safe APIs"]
        REST["REST APIs<br>Next.js Routes"]
        WS["WebSocket<br>Real-time"]
  end
 subgraph subGraph2["Business Logic Layer"]
        AGENT["Agent Runtime<br>AI Agent Execution"]
        MODEL["Model Runtime<br>LLM Provider Abstraction"]
        CONTEXT["Context Engine<br>RAG Processing"]
        FILE["File Processing<br>Document Parsing"]
        KB["Knowledge Base<br>Vector Search"]
        MCP_SVC["MCP Service<br>Model Context Protocol"]
  end
 subgraph subGraph3["Data Layer"]
        PG[("PostgreSQL<br>Production DB")]
        PGLITE[("PGLite<br>Client-side DB")]
        S3[("S3 Storage<br>File Storage")]
  end
 subgraph subGraph4["LLM Proxy & Providers"]
        LITELLM["LiteLLM Proxy<br>LLM Gateway"]
        OPENAI["OpenAI API<br>GPT Models"]
  end
 subgraph subGraph5["MCP Servers"]
        MCP1["MCP Server 1<br/>Tools/Resources"]
        MCP2["MCP Server 2<br/>Tools/Resources"]
        MCPN["MCP Server N<br/>Tools/Resources"]
  end
 subgraph subGraph6["Observability Stack"]
        OTEL["OTEL Collector<br/>Traces & Metrics"]
        TEMPO[("Tempo<br/>Distributed Tracing")]
        PROM[("Prometheus<br/>Metrics Storage")]
        GRAFANA["Grafana<br/>Visualization"]
        LANGFUSE["Langfuse<br/>LLM Observability"]
  end
 subgraph subGraph7["External Services"]
        AUTH["Auth Providers<br>NextAuth/Clerk"]
        CLOUD["Cloud Services<br>S3/Storage"]
  end
    WEB --> TRPC & REST
    MOBILE --> TRPC
    TRPC --> AGENT & MODEL & FILE & AUTH & MCP_SVC
    REST --> KB
    WS --> AGENT
    AGENT --> MODEL & CONTEXT & PG & MCP_SVC
    CONTEXT --> KB
    FILE --> KB & S3 & PG & CLOUD
    MODEL --> LITELLM
    LITELLM --> OPENAI
    MCP_SVC --> MCP1 & MCP2 & MCPN
    AGENT --> OTEL
    MODEL --> OTEL
    OTEL --> TEMPO & PROM
    TEMPO --> GRAFANA
    PROM --> GRAFANA
    MODEL --> LANGFUSE
    KB --> PG
    PG --> PGLITE
```

#### Sơ Đồ Component Interaction

```mermaid
graph LR
    subgraph "Frontend"
        UI[UI Components<br/>React + Ant Design]
        STORE[State Management<br/>Zustand + SWR]
        FEATURES[Features<br/>Chat/Agent/File]
    end

    subgraph "Backend Services"
        CHAT_SVC[Chat Service]
        AGENT_SVC[Agent Service]
        FILE_SVC[File Service]
        DOC_SVC[Document Service]
        SEARCH_SVC[Search Service]
    end

    subgraph "Core Packages"
        AGENT_RT[Agent Runtime]
        MODEL_RT[Model Runtime]
        CTX_ENG[Context Engine]
        FILE_LD[File Loaders]
    end

    subgraph "Data"
        DB[(Database<br/>Drizzle ORM)]
        VECTOR[Vector Store<br/>Embeddings]
    end

    UI --> STORE
    STORE --> FEATURES
    FEATURES --> CHAT_SVC
    FEATURES --> AGENT_SVC
    FEATURES --> FILE_SVC

    CHAT_SVC --> AGENT_RT
    AGENT_SVC --> AGENT_RT
    FILE_SVC --> FILE_LD
    DOC_SVC --> CTX_ENG
    SEARCH_SVC --> CTX_ENG

    AGENT_RT --> MODEL_RT
    AGENT_RT --> CTX_ENG
    CTX_ENG --> VECTOR
    FILE_LD --> DOC_SVC

    CHAT_SVC --> DB
    AGENT_SVC --> DB
    FILE_SVC --> DB
    DOC_SVC --> DB
    CTX_ENG --> DB
```

#### Sơ Đồ Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Agent
    participant Model
    participant Context
    participant DB
    participant LLM

    User->>Frontend: Input Message
    Frontend->>API: tRPC Call
    API->>Agent: Process Request
    Agent->>Context: Check Knowledge Base
    Context->>DB: Query Relevant Chunks
    DB-->>Context: Return Chunks
    Context-->>Agent: Assemble Context
    Agent->>Model: Call LLM with Context
    Model->>LLM: API Request (OpenAI)
    LLM-->>Model: Response
    Model-->>Agent: Processed Response
    Agent->>DB: Save Message
    Agent-->>API: Return Response
    API-->>Frontend: tRPC Response
    Frontend-->>User: Display Message
```

#### Sơ Đồ File Processing Flow

```mermaid
flowchart TD
    START[User Uploads File] --> UPLOAD[File Upload Service]
    UPLOAD --> PARSE[File Parser<br/>PDF/DOCX/TXT/etc]
    PARSE --> EXTRACT[Extract Content]
    EXTRACT --> DOC[Create Document]
    DOC --> CHUNK[Chunking<br/>Split into chunks]
    CHUNK --> EMBED[Generate Embeddings<br/>Vector conversion]
    EMBED --> SAVE[Save to Database]
    SAVE --> INDEX[Index in Vector Store]
    INDEX --> ASSOC[Associate with<br/>Knowledge Base]
    ASSOC --> DONE[Ready for RAG]
```

#### Sơ Đồ RAG (Retrieval-Augmented Generation) Flow

```mermaid
flowchart LR
    QUERY[User Query] --> EMBED_Q[Query Embedding]
    EMBED_Q --> SEARCH[Vector Search<br/>Similarity Search]
    SEARCH --> RETRIEVE[Retrieve Top Chunks]
    RETRIEVE --> ASSEMBLE[Assemble Context]
    ASSEMBLE --> LLM[LLM Call<br/>with Context]
    LLM --> RESPONSE[Generate Response]
    RESPONSE --> USER[Return to User]
```

### 1.2. Công Nghệ Nền Tảng

#### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **UI Components**: 
  - Ant Design 5
  - @lobehub/ui
  - antd-style (CSS-in-JS)
- **State Management**: 
  - Zustand (client state)
  - SWR (server state)
- **Routing**: Next.js App Router
- **Internationalization**: react-i18next (hỗ trợ 16 ngôn ngữ)

#### Backend Stack
- **Runtime**: Node.js
- **API Framework**: tRPC (type-safe APIs)
- **Server Framework**: Next.js Server Actions & API Routes
- **Database ORM**: Drizzle ORM
- **Real-time**: WebSocket

#### Database
- **Production**: PostgreSQL
- **Client-side**: PGLite (in-memory PostgreSQL)
- **ORM**: Drizzle ORM với type-safe queries

#### Build & Development
- **Package Manager**: pnpm (monorepo)
- **Build Tool**: Next.js (Turbopack dev, Webpack prod)
- **Testing**: Vitest, Testing Library
- **Type Checking**: TypeScript

### 1.3. Kiến Trúc Monorepo

Hệ thống được tổ chức thành các packages độc lập:

```
dx_ai_v2/
├── apps/
│   └── desktop/          # Electron desktop application
├── packages/
│   ├── agent-runtime/    # AI agent execution engine
│   ├── model-runtime/    # LLM provider abstraction layer
│   ├── context-engine/   # Context processing & RAG
│   ├── database/         # Database schemas & migrations
│   ├── file-loaders/     # File processing & parsing
│   ├── web-crawler/      # Web scraping capabilities
│   ├── python-interpreter/ # Python code execution
│   └── utils/            # Shared utilities
└── src/
    ├── app/              # Next.js app router pages
    ├── components/       # React UI components
    ├── features/         # Feature modules
    ├── server/           # Server-side logic
    └── store/            # Zustand state stores
```

## 2. Các Component Chính

### 2.1. Frontend Components

#### 2.1.1. Application Layer (`src/app/`)
- **Chat Interface**: Giao diện chat chính với AI assistants
- **Settings**: Quản lý cài đặt người dùng
- **File Management**: Quản lý file upload và documents
- **Knowledge Base**: Quản lý knowledge base và RAG
- **Authentication**: Login/logout flows

#### 2.1.2. UI Components (`src/components/`)
- **Chat Components**: Message bubbles, input, sidebar
- **Agent Components**: Agent cards, selection, configuration
- **File Components**: File upload, preview, management
- **Settings Components**: User preferences, system settings

#### 2.1.3. Feature Modules (`src/features/`)
- **Chat Feature**: Core chat functionality
- **Agent Feature**: AI assistant management
- **File Feature**: File handling and processing
- **Knowledge Base Feature**: RAG and document management
- **Plugin Feature**: Plugin system integration

### 2.2. Backend Components

#### 2.2.1. API Layer (`src/server/routers/`)

**Lambda Routers** (tRPC endpoints):
- `agent.ts`: Quản lý AI assistants
- `aiChat.ts`: Xử lý chat conversations
- `message.ts`: Quản lý messages
- `file.ts`: File upload và processing
- `knowledgeBase.ts`: Knowledge base operations
- `document.ts`: Document management
- `session.ts`: Chat session management
- `user.ts`: User management

**Edge Routers**:
- `upload.ts`: File upload endpoints
- `appStatus.ts`: Application status

**Desktop Routers**:
- `mcp.ts`: Model Context Protocol integration
- `pgTable.ts`: Database table operations

#### 2.2.2. Service Layer (`src/server/services/`)

- **AI Chat Service**: Xử lý logic chat với LLM
- **Agent Service**: Quản lý AI agents
- **File Service**: Xử lý file upload, parsing, storage
- **Document Service**: Document processing và indexing
- **Search Service**: Tìm kiếm trong knowledge base
- **ComfyUI Service**: Image generation integration
- **MCP Service**: Model Context Protocol support

#### 2.2.3. Core Packages

**Agent Runtime** (`packages/agent-runtime/`):
- Thực thi AI agents
- Quản lý agent state và lifecycle
- Tool calling và function execution

**Model Runtime** (`packages/model-runtime/`):
- Abstraction layer cho các LLM providers
- Hỗ trợ 60+ AI providers (OpenAI, Anthropic, Google, Azure, etc.)
- Unified API cho tất cả providers

**Context Engine** (`packages/context-engine/`):
- Xử lý context cho RAG
- Document chunking và embedding
- Context retrieval và ranking

**Database** (`packages/database/`):
- Database schemas (Drizzle ORM)
- Migrations
- Repositories pattern
- Models và types

**File Loaders** (`packages/file-loaders/`):
- Hỗ trợ 20+ file formats (PDF, DOCX, TXT, MD, etc.)
- File parsing và extraction
- Content normalization

### 2.3. Data Models

#### 2.3.1. Core Entities

**Users**:
- User authentication và profiles
- User settings và preferences
- User memories và context

**Agents**:
- AI assistant configurations
- System prompts và parameters
- Model settings và providers

**Sessions/Topics**:
- Chat conversations
- Message history
- Session metadata

**Messages**:
- Chat messages (user và assistant)
- Message content và metadata
- Attachments và files

**Files**:
- Uploaded files
- File metadata
- Storage URLs

**Documents**:
- Processed documents
- Document chunks
- Embeddings và vectors

**Knowledge Bases**:
- Knowledge base collections
- Document associations
- RAG configurations

### 2.4. External Integrations

#### 2.4.1. AI Providers
- **OpenAI**: GPT-4, GPT-3.5, DALL-E
- **Anthropic**: Claude models
- **Google**: Gemini, PaLM
- **Azure OpenAI**: Enterprise OpenAI
- **60+ providers khác**: Hỗ trợ đa dạng LLM providers

#### 2.4.2. Authentication
- **NextAuth**: SSO với Auth0, GitHub, Azure AD
- **Clerk**: Full-featured authentication service
- **Access Code**: Simple password protection

#### 2.4.3. Storage
- **S3**: Cloud file storage
- **Local Storage**: File system storage
- **Database**: PostgreSQL cho structured data

#### 2.4.4. LiteLLM Proxy
- **LiteLLM**: LLM proxy gateway được tích hợp qua `OPENAI_PROXY_URL`
- **Chức năng**: 
  - Unified API interface cho nhiều LLM providers
  - Rate limiting và cost tracking
  - Load balancing giữa các providers
  - Fallback mechanisms
- **Cấu hình**: Được cấu hình qua environment variable `OPENAI_PROXY_URL`
- **Vị trí**: Nằm giữa Model Runtime và OpenAI API, đóng vai trò gateway

#### 2.4.5. MCP Servers (Model Context Protocol)
- **MCP Service**: Service quản lý và tương tác với MCP servers
- **MCP Servers**: Danh sách các MCP servers cung cấp:
  - **Tools**: Các công cụ có thể được gọi bởi AI agents
  - **Resources**: Tài nguyên có thể được truy cập
  - **Prompts**: Prompt templates có thể tái sử dụng
- **Tích hợp**: 
  - MCP servers được cài đặt và quản lý qua MCP Service
  - Agents có thể gọi tools từ MCP servers
  - Hỗ trợ cả stdio và streamable MCP servers
- **API**: MCP router cung cấp endpoints để:
  - List tools, resources, prompts
  - Call tools từ MCP servers
  - Get server manifests
  - Validate server installations

#### 2.4.6. Observability Stack

**OpenTelemetry Stack**:
- **OTEL Collector**: 
  - Thu thập traces và metrics từ ứng dụng
  - Port: 4318 (HTTP), 4317 (gRPC)
  - Protocol: OTLP (OpenTelemetry Protocol)
  - Export traces đến Tempo và metrics đến Prometheus
- **Tempo**: 
  - Distributed tracing backend
  - Lưu trữ và query traces
  - Tích hợp với Grafana để visualize
- **Prometheus**: 
  - Metrics collection và storage
  - Time-series database
  - Scraping metrics từ các services
- **Grafana**: 
  - Visualization platform
  - Port: 3000
  - Dashboard cho traces (Tempo) và metrics (Prometheus)
  - TraceQL editor để query traces

**Langfuse**:
- **LLM Observability**: Platform theo dõi và phân tích LLM usage
- **Tính năng**:
  - Tracing: Theo dõi từng LLM request/response
  - Analytics: Phân tích usage patterns
  - Evaluation: Đánh giá chất lượng responses
  - Cost tracking: Theo dõi chi phí sử dụng
- **Cấu hình**: 
  - `ENABLE_LANGFUSE`: Enable/disable Langfuse
  - `LANGFUSE_PUBLIC_KEY`: Public API key
  - `LANGFUSE_SECRET_KEY`: Secret API key
  - `LANGFUSE_HOST`: Langfuse server URL (default: https://cloud.langfuse.com)
- **Tích hợp**: Tự động trace tất cả LLM calls qua Model Runtime

## 3. Tính Năng Đang Bật

### 3.1. Core Features (Enabled)

#### ✅ Chat & Conversation
- **Multi-turn Conversations**: Hỗ trợ đàm thoại nhiều lượt
- **Session Management**: Quản lý nhiều chat sessions
- **Message History**: Lưu trữ và truy xuất lịch sử chat
- **Token Counter**: Đếm tokens sử dụng
- **Welcome Suggestions**: Gợi ý câu hỏi khi bắt đầu

#### ✅ AI Assistants
- **Predefined Assistants**: 3 assistants được định sẵn:
  - General Assistant 🤖 - AI đa năng cho các tác vụ hàng ngày
  - Code Assistant 💻 - Trợ lý lập trình chuyên nghiệp
  - Writing Assistant ✍️ - Trợ lý viết và tạo nội dung
- **Agent Editing**: Cho phép chỉnh sửa agents
- **Session Creation**: Tạo sessions mới

#### ✅ Knowledge Base & RAG
- **Knowledge Base**: Hệ thống quản lý knowledge base
- **Document Upload**: Upload và xử lý documents
- **RAG (Retrieval-Augmented Generation)**: Tìm kiếm và sử dụng thông tin từ documents
- **File Processing**: Hỗ trợ nhiều định dạng file (PDF, DOCX, TXT, MD, etc.)
- **Document Chunking**: Chia nhỏ documents thành chunks
- **Vector Search**: Tìm kiếm semantic trong documents

#### ✅ Voice Features
- **Speech-to-Text (STT)**: Chuyển giọng nói thành text
- **Text-to-Speech (TTS)**: Chuyển text thành giọng nói
- **Voice Input**: Nhập liệu bằng giọng nói

#### ✅ File Management
- **File Upload**: Upload files lên hệ thống
- **File Preview**: Xem trước nội dung files
- **File Association**: Liên kết files với agents và messages
- **Multiple Formats**: Hỗ trợ 20+ định dạng file

#### ✅ Group Chat
- **Multi-agent Conversations**: Chat với nhiều agents cùng lúc
- **Agent Orchestration**: Điều phối nhiều agents

#### ✅ Plugins
- **Plugin System**: Hệ thống plugin mở rộng
- **Built-in Tools**: 
  - Web Browsing: Duyệt web và tìm kiếm
  - Code Interpreter: Thực thi Python code
  - Artifacts: Tạo và quản lý artifacts
  - Local System Tools (Desktop only): Truy cập hệ thống local

#### ✅ Authentication
- **Clerk Sign Up**: Đăng ký tài khoản với Clerk
- **NextAuth Integration**: SSO với các providers
- **Access Code Protection**: Bảo vệ bằng access code

#### ✅ User Experience
- **Internationalization**: Hỗ trợ 16 ngôn ngữ
- **Responsive Design**: Tối ưu cho mobile và desktop
- **Dark Mode**: Giao diện tối
- **Changelog**: Hiển thị thay đổi phiên bản

### 3.2. Features Disabled (Enterprise Configuration)

#### ❌ Settings & Configuration
- **Language Model Settings**: Ẩn cài đặt LLM (chỉ dùng OpenAI qua env)
- **Provider Settings**: Ẩn cài đặt providers
- **OpenAI API Key UI**: Không cho phép cấu hình API key qua UI (chỉ qua env)
- **API Key Management**: Ẩn quản lý API keys

#### ❌ Image Generation
- **DALL-E**: Tắt image generation với DALL-E
- **AI Image**: Tắt các tính năng AI image khác

#### ❌ Market & Discovery
- **Market**: Ẩn marketplace/discover page
- **Check Updates**: Tắt kiểm tra cập nhật

#### ❌ External Links
- **GitHub Links**: Ẩn links đến GitHub
- **Documentation Links**: Ẩn links đến documentation
- **Cloud Promotion**: Tắt quảng cáo cloud services

#### ❌ Advanced Features
- **RAG Evaluation**: Tắt đánh giá RAG
- **Pin List**: Tắt tính năng pin sessions

### 3.3. Security Features

#### Authentication & Authorization
- **Route Protection**: Bảo vệ các routes quan trọng (`/chat`, `/settings`, `/files`)
- **Access Code**: Bảo vệ đơn giản bằng password
- **Full Auth Protection**: Có thể bật để bảo vệ tất cả routes
- **SSO Support**: Hỗ trợ single sign-on với Auth0, GitHub, Azure AD

#### Data Security
- **Environment Variables**: API keys chỉ cấu hình qua environment variables
- **Database Encryption**: Hỗ trợ mã hóa kết nối database
- **Secure File Storage**: Files được lưu trữ an toàn

### 3.4. Deployment Options

#### Sơ Đồ Deployment Architecture

```mermaid
graph TB
    subgraph "Web Deployment"
        VERCEL[Vercel<br/>Serverless]
        DOCKER[Docker<br/>Container]
        STANDALONE[Standalone<br/>Next.js Build]
    end

    subgraph "Desktop Deployment"
        ELECTRON[Electron App<br/>Windows/Mac/Linux]
        LOCAL[Local Tools<br/>System Access]
    end

    subgraph "Database Deployment"
        PG_PROD[(PostgreSQL<br/>Production)]
        NEON[(Neon<br/>Serverless)]
        PGLITE_CLIENT[(PGLite<br/>Client-side)]
    end

    subgraph "Storage"
        S3_STORAGE[(S3<br/>Cloud Storage)]
        LOCAL_STORAGE[(Local FS<br/>File Storage)]
    end

    subgraph "LLM Infrastructure"
        LITELLM_DEPLOY[LiteLLM Proxy<br/>LLM Gateway]
        OPENAI_EXT[OpenAI API]
    end

    subgraph "MCP Infrastructure"
        MCP_SERVERS[MCP Servers<br/>Tools/Resources/Prompts]
    end

    subgraph "Observability Stack"
        OTEL_DEPLOY[OTEL Collector<br/>Port 4318/4317]
        TEMPO_DEPLOY[(Tempo<br/>Tracing)]
        PROM_DEPLOY[(Prometheus<br/>Metrics)]
        GRAFANA_DEPLOY[Grafana<br/>Port 3000]
        LANGFUSE_DEPLOY[Langfuse<br/>LLM Observability]
    end

    subgraph "External Services"
        AUTH_EXT[Auth Providers]
    end

    VERCEL --> PG_PROD
    VERCEL --> S3_STORAGE
    DOCKER --> PG_PROD
    DOCKER --> S3_STORAGE
    STANDALONE --> PG_PROD

    ELECTRON --> PGLITE_CLIENT
    ELECTRON --> LOCAL_STORAGE
    ELECTRON --> LOCAL

    VERCEL --> LITELLM_DEPLOY
    DOCKER --> LITELLM_DEPLOY
    STANDALONE --> LITELLM_DEPLOY
    ELECTRON --> LITELLM_DEPLOY
    LITELLM_DEPLOY --> OPENAI_EXT

    DOCKER --> MCP_SERVERS
    ELECTRON --> MCP_SERVERS

    DOCKER --> OTEL_DEPLOY
    OTEL_DEPLOY --> TEMPO_DEPLOY
    OTEL_DEPLOY --> PROM_DEPLOY
    TEMPO_DEPLOY --> GRAFANA_DEPLOY
    PROM_DEPLOY --> GRAFANA_DEPLOY

    VERCEL --> LANGFUSE_DEPLOY
    DOCKER --> LANGFUSE_DEPLOY
    STANDALONE --> LANGFUSE_DEPLOY

    VERCEL --> AUTH_EXT
    DOCKER --> AUTH_EXT
    STANDALONE --> AUTH_EXT
```

#### Web Deployment
- **Vercel**: Hỗ trợ deploy lên Vercel
- **Docker**: Containerization với Docker
- **Standalone Mode**: Standalone Next.js build

#### Desktop Application
- **Electron**: Desktop app với Electron
- **Local Tools**: Truy cập hệ thống local (chỉ desktop)

#### Database Options
- **PostgreSQL**: Production database
- **PGLite**: Client-side in-memory database
- **Neon**: Serverless PostgreSQL support

#### Observability Stack Deployment

**OpenTelemetry Stack** (Docker deployment):
- **OTEL Collector**: 
  - Container: `lobe-otel-collector`
  - Ports: 4318 (HTTP), 4317 (gRPC)
  - Thu thập traces và metrics từ ứng dụng
  - Export đến Tempo (traces) và Prometheus (metrics)
- **Tempo**: 
  - Container: `lobe-tempo`
  - Distributed tracing backend
  - Lưu trữ traces với volume `tempo_data`
- **Prometheus**: 
  - Container: `lobe-prometheus`
  - Metrics collection và storage
  - Volume: `prometheus_data`
  - Hỗ trợ OTLP receiver
- **Grafana**: 
  - Container: `lobe-grafana`
  - Port: 3000
  - Anonymous access enabled
  - Dashboards và datasources được provisioned
  - Tích hợp với Tempo và Prometheus

**Langfuse**:
- **Cloud**: Sử dụng Langfuse Cloud (https://cloud.langfuse.com)
- **Self-hosted**: Có thể self-host Langfuse
- **Configuration**: 
  - Environment variables: `ENABLE_LANGFUSE`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`
  - Tự động trace tất cả LLM calls

**LiteLLM Proxy**:
- **Deployment**: Có thể deploy riêng hoặc sử dụng managed service
- **Configuration**: Cấu hình qua `OPENAI_PROXY_URL` environment variable
- **Function**: Gateway cho tất cả LLM requests

**MCP Servers**:
- **Desktop**: MCP servers chạy local trên desktop app
- **Server**: MCP servers có thể được deploy riêng
- **Management**: Quản lý qua MCP Service trong ứng dụng

## 4. Data Flow

### 4.1. Chat Flow

```
User Input
    ↓
Frontend (React Component)
    ↓
tRPC API Call
    ↓
Server Handler (aiChat.ts)
    ↓
Agent Runtime
    ↓
Model Runtime → LLM Provider (OpenAI)
    ↓
Response Processing
    ↓
Context Engine (RAG nếu có knowledge base)
    ↓
Database (Save message)
    ↓
Response to Client
    ↓
UI Update
```

### 4.2. File Upload Flow

```
File Upload
    ↓
File Service
    ↓
File Loader (Parse content)
    ↓
Document Service (Create document)
    ↓
Chunking (Split into chunks)
    ↓
Embedding (Vector generation)
    ↓
Database (Save chunks & embeddings)
    ↓
Knowledge Base Association
```

### 4.3. RAG Flow

```
User Query
    ↓
Query Embedding
    ↓
Vector Search (Similarity search)
    ↓
Retrieve Relevant Chunks
    ↓
Context Assembly
    ↓
LLM Call (with context)
    ↓
Response Generation
```

## 5. Scalability & Performance

### 5.1. Architecture Patterns
- **Monorepo**: Dễ dàng quản lý và chia sẻ code
- **Modular Design**: Components độc lập, dễ mở rộng
- **Type Safety**: TypeScript end-to-end
- **Code Splitting**: Lazy loading components

### 5.2. Performance Optimizations
- **Turbopack**: Fast dev builds
- **Webpack**: Optimized production builds
- **SWR**: Efficient data fetching và caching
- **React 19**: Latest React features và optimizations

### 5.3. Database Optimization
- **Indexing**: Database indexes cho queries thường dùng
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Drizzle ORM với type-safe queries

## 6. Monitoring & Observability

### 6.1. Logging
- **Debug Package**: Structured logging với namespaces
- **Pino**: High-performance logging

### 6.2. Error Handling
- **Error Boundaries**: React error boundaries
- **Server Error Handling**: Centralized error handling
- **Type Guards**: Runtime type checking

### 6.3. Analytics
- **Vercel Analytics**: Web analytics
- **PostHog**: User behavior tracking (optional)

## 7. Development & Maintenance

### 7.1. Code Quality
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing
- **Testing Library**: Component testing

### 7.2. CI/CD
- **GitHub Actions**: Automated testing và deployment
- **Semantic Release**: Automated versioning
- **Type Checking**: Automated type checking

### 7.3. Documentation
- **Code Comments**: Inline documentation
- **README Files**: Package documentation
- **Development Guides**: `.cursor/rules/` directory

## 8. Future Roadmap

### Planned Features
- **Mobile App**: React Native mobile application
- **Advanced RAG**: Enhanced retrieval và ranking
- **More AI Providers**: Thêm providers mới
- **Plugin Marketplace**: Plugin ecosystem
- **Analytics Dashboard**: Usage analytics

## Kết Luận

DxAi là một nền tảng AI chat hiện đại, được xây dựng với kiến trúc modular và scalable. Hệ thống cung cấp các tính năng cốt lõi cho doanh nghiệp với cấu hình tối ưu, bảo mật cao, và khả năng mở rộng tốt. Với việc sử dụng các công nghệ hiện đại và best practices, DxAi sẵn sàng cho production deployment và có thể mở rộng theo nhu cầu doanh nghiệp.

