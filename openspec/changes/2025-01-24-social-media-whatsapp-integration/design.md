## Context
The CRM system needs integration with social media platforms (WhatsApp, Instagram, Facebook, TikTok, Twitter) to centralize customer communications and capture orders from these channels. This integration will be implemented using n8n as the automation layer to handle API complexities and provide flexibility for future platform additions.

## Goals / Non-Goals
- Goals:
  - Centralize all social media conversations in the CRM
  - Automatically capture and process orders from WhatsApp
  - Provide real-time response capabilities
  - Enable analytics on social media performance
  - Maintain flexibility to add new platforms

- Non-Goals:
  - Build native mobile apps for social media
  - Replace existing social media management tools
  - Implement full social media posting/scheduling
  - Store all historical social media data indefinitely

## Decisions

### Decision 1: Use n8n for API integration
- **What**: All social media API interactions will be handled by n8n workflows
- **Why**:
  - Reduces development complexity
  - Provides visual workflow building
  - Built-in error handling and retry mechanisms
  - Easy to modify without code changes
  - 200+ native integrations available
- **Alternatives considered**:
  - Direct API implementation in Next.js: More control but higher complexity
  - Zapier: Mature platform but expensive and vendor lock-in
  - Custom middleware: Too much maintenance overhead

### Decision 2: Database-first approach with Supabase
- **What**: n8n will write directly to Supabase PostgreSQL database
- **Why**:
  - Real-time capabilities for live updates
  - Row Level Security for data protection
  - Single source of truth
  - Direct PostgreSQL performance
- **Trade-offs**: Requires careful credential management

### Decision 3: Event-driven architecture
- **What**: All social interactions trigger events that update the CRM
- **Why**:
  - Scalable for high message volumes
  - Decoupled from frontend
  - Enables analytics and auditing
  - Support for async processing

## Risks / Trade-offs

### Risk: API rate limits
- **Mitigation**: n8n built-in rate limiting and queue management
- **Monitoring**: Track API usage and implement throttling

### Risk: Webhook reliability
- **Mitigation**:
  - Retry logic in n8n workflows
  - Webhook signature verification
  - Backup polling for critical platforms

### Trade-off: Infrastructure complexity
- **Self-hosted n8n**: Requires maintenance but gives full control
- **Alternative**: n8n Cloud would simplify ops but adds cost

### Trade-off: Data privacy
- **Storing messages in CRM**: Better for context but privacy concerns
- **Mitigation**: GDPR compliance, data retention policies, encryption

## Migration Plan

### Phase 1: Infrastructure (Week 1-2)
1. Deploy n8n instance with Docker
2. Configure SSL and authentication
3. Set up Supabase credentials in n8n
4. Create database schema
5. Test basic connectivity

### Phase 2: WhatsApp Integration (Week 3-4)
1. Set up WhatsApp Business API
2. Create webhook endpoint in n8n
3. Build message parsing workflow
4. Implement conversation creation
5. Test order detection

### Phase 3: Multi-platform Support (Week 5-6)
1. Add Instagram and Facebook connectors
2. Build unified inbox UI
3. Implement conversation assignment
4. Add real-time updates

### Phase 4: Analytics & Automation (Week 7-8)
1. Create analytics workflows
2. Build dashboard components
3. Implement automated responses
4. Add lead scoring

### Rollback Strategy
- Disable n8n workflows to stop new data flow
- CRM continues to function without social features
- Database changes are additive, no rollback needed

## Open Questions
- Should we implement message deletion policies?
- Do we need sentiment analysis on messages?
- Should we support social media posting from CRM?
- How long should we retain message history?

## Security Considerations
- All API tokens stored in n8n encrypted credentials
- Webhook signature verification for all platforms
- RLS policies on social media tables
- Audit logging for all social media operations
- Network restrictions between n8n and Supabase

## Performance Considerations
- Indexes on conversation_id, client_id, and timestamps
- Pagination for conversation lists
- Lazy loading for message history
- Background processing for analytics