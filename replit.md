# TRUTH-MD Session Generator

A WhatsApp session ID generator and linking service. Generates session credentials in the format `TRUTH-MD:~(Base64)`.

## Architecture

- **Frontend**: React + Vite + TailwindCSS (dark/green hacker aesthetic)
- **Backend**: Express + WebSockets for real-time session updates
- **WhatsApp**: @whiskeysockets/baileys for WhatsApp Web connection

## Key Features

- Pairing code method (phone number based)
- QR code method
- Real-time session status via WebSocket
- Session credentials output in `TRUTH-MD:~(Base64)` format

## Session ID Format

Sessions are identified internally as `truth_<hex>` and credentials are exported as `TRUTH-MD:~(<base64>)`.
