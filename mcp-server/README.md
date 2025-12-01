# UDS-POS MCP Server for Claude Desktop

This MCP (Model Context Protocol) server enables Claude Desktop to interact with the UDS-POS Device Management System. It provides tools for managing POS devices, service calls, engineers, and more directly from Claude Desktop.

## Features

### Tools Available

| Tool | Description |
|------|-------------|
| `list_devices` | List all POS devices with optional filtering by status, bank, or engineer |
| `get_device` | Get detailed information about a specific device |
| `search_devices` | Search devices by serial number or model |
| `list_calls` | List service calls with filtering options |
| `get_call` | Get detailed information about a specific call |
| `create_call` | Create a new service call |
| `assign_call` | Assign a call to an engineer |
| `update_call_status` | Update the status of a call |
| `list_engineers` | List all engineers with optional filtering |
| `get_engineer` | Get engineer details and workload |
| `get_engineer_workload` | Get workload statistics for engineers |
| `list_banks` | List all banks/organizations |
| `get_dashboard_stats` | Get dashboard KPIs and statistics |
| `get_stock_summary` | Get inventory summary by status and model |
| `update_device_status` | Update the status of a device |

### Resources

The server exposes browsable resources:
- `uds-pos://dashboard` - Current dashboard statistics
- `uds-pos://devices` - Device inventory
- `uds-pos://calls/pending` - Pending service calls
- `uds-pos://calls/active` - Active service calls
- `uds-pos://engineers` - Engineer list
- `uds-pos://banks` - Bank/organization list

### Prompts

Pre-built prompt templates for common tasks:
- `daily_summary` - Generate daily operations summary
- `analyze_workload` - Analyze engineer workload distribution
- `device_health_report` - Generate device health report
- `pending_calls_summary` - Summarize pending calls

## Prerequisites

- Node.js 18.0.0 or higher
- Claude Desktop application
- Supabase project with UDS-POS schema

## Installation

### Quick Setup

**macOS/Linux:**
```bash
cd mcp-server
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell):**
```powershell
cd mcp-server
.\setup.ps1
```

### Manual Setup

1. **Install dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Build the server:**
   ```bash
   npm run build
   ```

3. **Configure Claude Desktop:**

   Open your Claude Desktop configuration file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

   Add the following configuration:
   ```json
   {
     "mcpServers": {
       "uds-pos": {
         "command": "node",
         "args": ["/absolute/path/to/uds-pos/mcp-server/dist/index.js"],
         "env": {
           "SUPABASE_URL": "https://your-project.supabase.co",
           "SUPABASE_SERVICE_KEY": "your-service-role-key"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop** completely (quit and reopen)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (for full access) |
| `SUPABASE_ANON_KEY` | Alternative | Supabase anon key (limited access based on RLS) |

### Getting Supabase Credentials

1. Go to your Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy the **Project URL** for `SUPABASE_URL`
4. Copy the **service_role key** for `SUPABASE_SERVICE_KEY`

> **Security Note:** The service role key bypasses Row Level Security. Use the anon key if you want RLS policies to apply.

## Usage Examples

Once configured, you can interact with UDS-POS through Claude Desktop:

### View Dashboard Statistics
> "Show me the current dashboard statistics for UDS-POS"

### List Devices
> "List all faulty devices in the system"

### Create a Service Call
> "Create a new installation call for Bank ABC at 123 Main Street with high priority"

### Check Engineer Workload
> "Analyze the current workload distribution among engineers"

### Search for Devices
> "Search for devices with serial number starting with POS-2024"

### Get Daily Summary
> "Give me a daily summary of operations using the daily_summary prompt"

## Development

### Running in Development Mode

```bash
npm run dev
```

### Watching for Changes

```bash
npm run watch
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. Verify the configuration file is valid JSON
2. Check the path to `index.js` is correct and absolute
3. Ensure Node.js is in your PATH
4. Restart Claude Desktop completely

### Connection Errors

1. Verify `SUPABASE_URL` is correct
2. Check that `SUPABASE_SERVICE_KEY` has the right permissions
3. Ensure your Supabase project is running

### Permission Errors

If using `SUPABASE_ANON_KEY`, some operations may fail due to RLS policies. Switch to `SUPABASE_SERVICE_KEY` for full access.

## Architecture

```
mcp-server/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                  # Compiled JavaScript (after build)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── setup.sh              # macOS/Linux setup script
├── setup.ps1             # Windows setup script
└── README.md             # This file
```

## Security Considerations

- **Never commit** `claude_desktop_config.json` with real credentials
- Use environment variables or secure credential storage
- The service role key should be kept confidential
- Consider using the anon key with proper RLS policies for production

## License

MIT
