#!/bin/bash

# UDS-POS MCP Server Setup Script
# This script helps set up the MCP server for Claude Desktop

set -e

echo "============================================"
echo "UDS-POS MCP Server Setup"
echo "============================================"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
npm install

# Build the TypeScript
echo ""
echo "Building TypeScript..."
npm run build

echo ""
echo "Build complete!"
echo ""

# Detect OS and set config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "win"* ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "============================================"
echo "Claude Desktop Configuration"
echo "============================================"
echo ""
echo "To configure Claude Desktop, add the following to your config file:"
echo "Config location: $CONFIG_PATH"
echo ""
echo "Add this to your claude_desktop_config.json:"
echo ""
cat << EOF
{
  "mcpServers": {
    "uds-pos": {
      "command": "node",
      "args": ["$SCRIPT_DIR/dist/index.js"],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_URL",
        "SUPABASE_SERVICE_KEY": "YOUR_SUPABASE_SERVICE_KEY"
      }
    }
  }
}
EOF

echo ""
echo "============================================"
echo "Environment Variables Required"
echo "============================================"
echo ""
echo "SUPABASE_URL: Your Supabase project URL"
echo "  Example: https://xxxxx.supabase.co"
echo ""
echo "SUPABASE_SERVICE_KEY: Your Supabase service role key"
echo "  (Found in Supabase Dashboard > Settings > API > service_role key)"
echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "After updating your Claude Desktop config:"
echo "1. Restart Claude Desktop completely (quit and reopen)"
echo "2. Look for the hammer icon in the chat input area"
echo "3. You can now use UDS-POS tools in your conversations!"
echo ""
