## ADDED Requirements

### Requirement: Social Media Account Management
The system SHALL provide configuration management for social media and messaging platform accounts.

#### Scenario: Add WhatsApp account
- **WHEN** admin configures WhatsApp Business API
- **THEN** system stores encrypted credentials and validates connection

#### Scenario: Add Instagram account
- **WHEN** admin connects Instagram Business account
- **THEN** system validates permissions and stores access tokens

### Requirement: Social Media Message Ingestion
The system SHALL ingest messages from connected social media platforms through n8n workflows.

#### Scenario: Receive WhatsApp message
- **WHEN** WhatsApp message arrives via n8n webhook
- **THEN** system creates conversation and stores message content

#### Scenario: Receive Instagram DM
- **WHEN** Instagram Direct message arrives
- **THEN** system links to client profile and notifies assigned user

### Requirement: Social Media Conversation Management
The system SHALL provide unified interface for managing all social media conversations.

#### Scenario: View unified inbox
- **WHEN** user opens social inbox
- **THEN** system displays all conversations across platforms with unread counts

#### Scenario: Assign conversation
- **WHEN** manager assigns conversation to team member
- **THEN** system notifies assignee and tracks ownership

### Requirement: WhatsApp Order Processing
The system SHALL automatically detect and process orders from WhatsApp messages.

#### Scenario: Parse WhatsApp order
- **WHEN** message contains order keywords and product references
- **THEN** system extracts items and creates sales order draft

#### Scenario: Send order confirmation
- **WHEN** WhatsApp order is confirmed
- **THEN** system sends confirmation message with payment link

### Requirement: Social Media Analytics
The system SHALL track and report social media engagement and conversion metrics.

#### Scenario: View platform performance
- **WHEN** manager views social analytics dashboard
- **THEN** system shows message volume, response times, and conversion rates by platform

#### Scenario: Track ROI
- **WHEN** viewing social media reports
- **THEN** system attributes sales to originating social platforms

### Requirement: Message Template Management
The system SHALL provide configurable templates for common social media responses.

#### Scenario: Create quick reply template
- **WHEN** admin creates message template
- **THEN** system stores template with variable placeholders for personalization

#### Scenario: Use template in conversation
- **WHEN** agent selects template
- **THEN** system populates variables and sends message

### Requirement: Real-time Social Updates
The system SHALL provide real-time updates for social media interactions.

#### Scenario: Live message updates
- **WHEN** new message arrives from any platform
- **THEN** system updates UI in real-time without refresh

#### Scenario: Typing indicators
- **WHEN** customer is typing on social platform
- **THEN** system shows typing indicator in conversation view