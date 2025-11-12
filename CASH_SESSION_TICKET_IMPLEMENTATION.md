# Cash Session Ticket Auto-Print Implementation

## Overview
This implementation adds automatic PDF ticket generation and printing functionality when closing a cash register session (corte de caja). The PDF is generated in an 80mm thermal printer format and is automatically saved to Supabase Storage.

## Features Implemented

### 1. **Automatic Ticket Generation**
- When a cash session is closed, a PDF ticket is automatically generated
- The ticket uses an 80mm width format (standard for thermal printers)
- The PDF includes all session details: sales totals, cash counts, and differences

### 2. **Data Displayed on Ticket**
- **Header**: Company name (22 ELECTRONIC GROUP)
- **Session Information**: 
  - Session ID
  - Cashier who opened the session
  - Cashier who closed the session
  - Opening and closing date/time
- **Sales Summary**:
  - Total sales for the day
  - Cash sales
  - Card sales
  - Cash payouts/expenses
- **Cash Count**:
  - Starting float (opening cash)
  - Expected cash in drawer
  - Actual cash counted
  - Difference (overage/shortage)
- **Footer**: Thank you message and legal disclaimer

### 3. **PDF Generation & Storage**
- PDF is generated using `html2canvas` and `jsPDF`
- The PDF is uploaded to Supabase Storage bucket: `cash-session-tickets`
- The PDF URL is saved in the `cash_sessions` table under the `ticket_pdf_url` column
- The ticket is optimized for 80mm thermal printers

### 4. **Print Flow**
1. User clicks "Cerrar Sesión" (Close Session) in the POS
2. Session is closed and data is saved to the database
3. PDF ticket is automatically generated
4. PDF is uploaded to Supabase Storage
5. Print dialog opens automatically with the PDF
6. On mobile devices, users can share via AirPrint

### 5. **Error Handling**
- If PDF generation fails, an error message is shown
- If upload to Supabase fails, the print continues (PDF is still available locally)
- If popup blocker prevents printing, the PDF is downloaded automatically
- All errors are logged for debugging

## Files Modified/Created

### Modified Files:
1. **`src/components/pos/POSClient.tsx`**
   - Added automatic ticket generation on session close
   - Implemented PDF upload to Supabase Storage
   - Added print/download fallback logic

2. **`src/types/index.ts`**
   - Added `ticketPdfUrl?: string` field to `CashSession` interface

3. **`src/lib/services/cashSessionService.ts`**
   - Added `ticketPdfUrl` to session mapping
   - Created `updateCashSessionTicketUrl()` function to update PDF URL

### Created Files:
1. **`src/lib/services/pdfStorageService.ts`**
   - Service for uploading PDFs to Supabase Storage
   - Functions: `uploadPdfToStorage()`, `deletePdfFromStorage()`

2. **`src/app/api/cash-sessions/upload-ticket/route.ts`**
   - API endpoint for uploading ticket PDFs
   - Handles FormData from client
   - Updates cash session with PDF URL

3. **`supabase/migrations/20250202_add_ticket_pdf_url_to_cash_sessions.sql`**
   - Migration to add `ticket_pdf_url` column to `cash_sessions` table

4. **`scripts/setup-cash-session-tickets-bucket.sql`**
   - SQL script to create Supabase Storage bucket
   - Sets up RLS policies for bucket access

## Database Changes

### New Column:
```sql
ALTER TABLE cash_sessions ADD COLUMN ticket_pdf_url TEXT;
```

### Supabase Storage Bucket:
- **Bucket Name**: `cash-session-tickets`
- **Access**: Public read, authenticated write
- **RLS Policies**: 
  - Allow authenticated users to upload, update, delete
  - Allow public read access (for public URLs)

## Setup Instructions

1. **Run Database Migration**:
```bash
# Apply the migration to add ticket_pdf_url column
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/migrations/20250202_add_ticket_pdf_url_to_cash_sessions.sql
```

2. **Create Supabase Storage Bucket**:
```bash
# Run the bucket setup script in Supabase SQL Editor
# Or execute via psql:
psql -h <SUPABASE_HOST> -U postgres -d postgres -f scripts/setup-cash-session-tickets-bucket.sql
```

3. **Environment Variables** (Already configured):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Usage

### For Users:
1. Open a cash session at the start of the shift
2. Process sales normally
3. Click "Cerrar Sesión" when ready to close
4. Enter the actual cash count
5. Click "Confirmar y Cerrar Turno"
6. The ticket will automatically generate and print
7. If print dialog doesn't open, check for popup blockers
8. The PDF is also saved and can be accessed later from the database

### For Developers:
```typescript
// Close a cash session (triggers automatic ticket generation)
const closedSession = await closeCashSession(
  activeSession,
  userId,
  userName,
  actualCashCount
);
// Ticket is automatically generated and uploaded
// closedSession.ticketPdfUrl will contain the Storage URL
```

## Technical Details

### PDF Generation:
- **Format**: 80mm width, auto height based on content
- **Font**: Courier New (monospace for thermal printers)
- **DPI**: 96 (standard web resolution)
- **Scale**: 2x for better print quality
- **Image Format**: PNG (embedded in PDF)

### Storage:
- **Storage Path**: `cash-session-tickets/ticket-{sessionId}-{date}.pdf`
- **Example**: `cash-session-tickets/ticket-CS-ABC123-2025-02-02.pdf`
- **Access**: Public URLs for easy retrieval

## Testing

### Test Cases:
1. ✅ Close a session with positive difference (overage)
2. ✅ Close a session with negative difference (shortage)
3. ✅ Close a session with zero difference (balanced)
4. ✅ Verify PDF is generated in 80mm width
5. ✅ Verify PDF is uploaded to Supabase Storage
6. ✅ Verify PDF URL is saved in database
7. ✅ Test print dialog on different browsers
8. ✅ Test fallback to download when popup blocked
9. ✅ Test on mobile devices
10. ✅ Test error handling (network failures, etc.)

## Future Enhancements

### Potential Improvements:
1. **Transaction Details**: Add list of individual transactions to ticket
2. **Custom Branding**: Allow logo upload in settings
3. **Email Delivery**: Option to email ticket to manager
4. **Re-print Functionality**: Allow reprinting old tickets from history
5. **Thermal Printer Direct Integration**: Direct printing to thermal printer via USB/Bluetooth
6. **Ticket Templates**: Multiple templates for different printer sizes (58mm, 80mm)
7. **Signature Field**: Add manager signature line on ticket
8. **Multi-language Support**: Ticket in English/Spanish

## Troubleshooting

### Common Issues:

**Issue**: PDF doesn't print automatically
- **Solution**: Check browser popup blocker settings. Add site to allowed list.

**Issue**: PDF upload fails
- **Solution**: Check Supabase Storage bucket exists and has correct policies. Verify environment variables.

**Issue**: Ticket shows incorrect data
- **Solution**: Verify session data is correct before closing. Check `CashSession` interface mapping.

**Issue**: Print quality is poor
- **Solution**: Adjust `scale` parameter in `html2canvas` options (currently 2x).

**Issue**: Ticket is too wide/narrow for printer
- **Solution**: Adjust width in `createTicketElement` CSS (currently 80mm).

## Dependencies

- `html2canvas@^1.4.1` - For capturing HTML to image
- `jspdf@^2.5.2` - For PDF generation
- `@supabase/supabase-js@^2.45.0` - For storage and database

## Support

For issues or questions:
1. Check console logs (search for `[TICKET]` prefix)
2. Review Supabase Storage logs
3. Verify database column exists: `SELECT ticket_pdf_url FROM cash_sessions LIMIT 1;`
4. Check RLS policies on storage bucket

---

**Last Updated**: February 2, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
