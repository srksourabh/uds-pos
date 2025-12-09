#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Type for tool arguments
interface ToolArguments {
  [key: string]: unknown;
}

/**
 * Sanitize search input to prevent query injection attacks
 */
function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[%*]/g, '')
    .replace(/[()]/g, '')
    .replace(/\./g, ' ')
    .trim()
    .slice(0, 100);
}

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variables."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Create MCP Server
const server = new Server(
  {
    name: "uds-pos-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "list_devices",
    description: "List all POS devices in the system with optional filtering by status, bank, or engineer",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by device status (warehouse, issued, installed, faulty, returned)",
          enum: ["warehouse", "issued", "installed", "faulty", "returned"],
        },
        bank_id: {
          type: "string",
          description: "Filter by bank ID",
        },
        engineer_id: {
          type: "string",
          description: "Filter by engineer ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of devices to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_device",
    description: "Get detailed information about a specific device by ID or serial number",
    inputSchema: {
      type: "object" as const,
      properties: {
        device_id: {
          type: "string",
          description: "The device ID (UUID)",
        },
        serial_number: {
          type: "string",
          description: "The device serial number",
        },
      },
    },
  },
  {
    name: "list_calls",
    description: "List service calls with optional filtering",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by call status (pending, assigned, in_progress, completed, cancelled)",
          enum: ["pending", "assigned", "in_progress", "completed", "cancelled"],
        },
        call_type: {
          type: "string",
          description: "Filter by call type (install, swap, deinstall, maintenance, breakdown)",
          enum: ["install", "swap", "deinstall", "maintenance", "breakdown"],
        },
        priority: {
          type: "string",
          description: "Filter by priority (low, medium, high, critical)",
          enum: ["low", "medium", "high", "critical"],
        },
        engineer_id: {
          type: "string",
          description: "Filter by assigned engineer ID",
        },
        bank_id: {
          type: "string",
          description: "Filter by bank ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of calls to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_call",
    description: "Get detailed information about a specific service call",
    inputSchema: {
      type: "object" as const,
      properties: {
        call_id: {
          type: "string",
          description: "The call ID (UUID)",
        },
      },
      required: ["call_id"],
    },
  },
  {
    name: "create_call",
    description: "Create a new service call",
    inputSchema: {
      type: "object" as const,
      properties: {
        call_type: {
          type: "string",
          description: "Type of service call",
          enum: ["install", "swap", "deinstall", "maintenance", "breakdown"],
        },
        priority: {
          type: "string",
          description: "Priority level",
          enum: ["low", "medium", "high", "critical"],
        },
        bank_id: {
          type: "string",
          description: "Bank ID for the call",
        },
        location_address: {
          type: "string",
          description: "Address where the service is needed",
        },
        contact_name: {
          type: "string",
          description: "Contact person name",
        },
        contact_phone: {
          type: "string",
          description: "Contact phone number",
        },
        notes: {
          type: "string",
          description: "Additional notes about the call",
        },
        scheduled_date: {
          type: "string",
          description: "Scheduled date for the call (ISO 8601 format)",
        },
      },
      required: ["call_type", "priority", "bank_id", "location_address"],
    },
  },
  {
    name: "assign_call",
    description: "Assign a service call to an engineer",
    inputSchema: {
      type: "object" as const,
      properties: {
        call_id: {
          type: "string",
          description: "The call ID to assign",
        },
        engineer_id: {
          type: "string",
          description: "The engineer ID to assign the call to",
        },
      },
      required: ["call_id", "engineer_id"],
    },
  },
  {
    name: "list_engineers",
    description: "List all engineers with optional filtering",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description: "Filter by engineer status (active, inactive, pending)",
          enum: ["active", "inactive", "pending"],
        },
        bank_id: {
          type: "string",
          description: "Filter by assigned bank ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of engineers to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_engineer",
    description: "Get detailed information about a specific engineer",
    inputSchema: {
      type: "object" as const,
      properties: {
        engineer_id: {
          type: "string",
          description: "The engineer ID (UUID)",
        },
      },
      required: ["engineer_id"],
    },
  },
  {
    name: "list_banks",
    description: "List all banks/organizations in the system",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of banks to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_dashboard_stats",
    description: "Get dashboard statistics and KPIs",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_stock_summary",
    description: "Get stock/inventory summary by status and location",
    inputSchema: {
      type: "object" as const,
      properties: {
        bank_id: {
          type: "string",
          description: "Filter by bank ID",
        },
      },
    },
  },
  {
    name: "search_devices",
    description: "Search devices by serial number, model, or other attributes",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_engineer_workload",
    description: "Get workload statistics for an engineer or all engineers",
    inputSchema: {
      type: "object" as const,
      properties: {
        engineer_id: {
          type: "string",
          description: "Specific engineer ID (optional, returns all if not provided)",
        },
      },
    },
  },
  {
    name: "update_call_status",
    description: "Update the status of a service call",
    inputSchema: {
      type: "object" as const,
      properties: {
        call_id: {
          type: "string",
          description: "The call ID to update",
        },
        status: {
          type: "string",
          description: "New status for the call",
          enum: ["pending", "assigned", "in_progress", "completed", "cancelled"],
        },
        notes: {
          type: "string",
          description: "Notes about the status change",
        },
      },
      required: ["call_id", "status"],
    },
  },
  {
    name: "update_device_status",
    description: "Update the status of a device",
    inputSchema: {
      type: "object" as const,
      properties: {
        device_id: {
          type: "string",
          description: "The device ID to update",
        },
        status: {
          type: "string",
          description: "New status for the device",
          enum: ["warehouse", "issued", "installed", "faulty", "returned"],
        },
        notes: {
          type: "string",
          description: "Notes about the status change",
        },
      },
      required: ["device_id", "status"],
    },
  },
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as ToolArguments;
  const supabase = getSupabaseClient();

  try {
    switch (name) {
      case "list_devices": {
        const limit = typeof args.limit === "number" ? args.limit : 50;
        let query = supabase
          .from("devices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (args.status) query = query.eq("status", args.status as string);
        if (args.bank_id) query = query.eq("bank_id", args.bank_id as string);
        if (args.engineer_id) query = query.eq("engineer_id", args.engineer_id as string);

        const { data, error } = await query;
        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_device": {
        let query = supabase.from("devices").select("*");

        if (args.device_id) {
          query = query.eq("id", args.device_id as string);
        } else if (args.serial_number) {
          query = query.eq("serial_number", args.serial_number as string);
        } else {
          throw new Error("Either device_id or serial_number is required");
        }

        const { data, error } = await query.single();
        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "list_calls": {
        const limit = typeof args.limit === "number" ? args.limit : 50;
        let query = supabase
          .from("calls")
          .select("*, banks(name), user_profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (args.status) query = query.eq("status", args.status as string);
        if (args.call_type) query = query.eq("call_type", args.call_type as string);
        if (args.priority) query = query.eq("priority", args.priority as string);
        if (args.engineer_id) query = query.eq("engineer_id", args.engineer_id as string);
        if (args.bank_id) query = query.eq("bank_id", args.bank_id as string);

        const { data, error } = await query;
        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_call": {
        const callId = args.call_id as string;
        if (!callId) throw new Error("call_id is required");

        const { data, error } = await supabase
          .from("calls")
          .select("*, banks(name), user_profiles(full_name), call_devices(*, devices(*))")
          .eq("id", callId)
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "create_call": {
        const callType = args.call_type as string;
        const priority = args.priority as string;
        const bankId = args.bank_id as string;
        const locationAddress = args.location_address as string;

        if (!callType || !priority || !bankId || !locationAddress) {
          throw new Error("call_type, priority, bank_id, and location_address are required");
        }

        const { data, error } = await supabase
          .from("calls")
          .insert({
            call_type: callType,
            priority: priority,
            bank_id: bankId,
            location_address: locationAddress,
            contact_name: args.contact_name as string | undefined,
            contact_phone: args.contact_phone as string | undefined,
            notes: args.notes as string | undefined,
            scheduled_date: args.scheduled_date as string | undefined,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Call created successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "assign_call": {
        const callId = args.call_id as string;
        const engineerId = args.engineer_id as string;

        if (!callId || !engineerId) {
          throw new Error("call_id and engineer_id are required");
        }

        const { data, error } = await supabase
          .from("calls")
          .update({
            engineer_id: engineerId,
            status: "assigned",
          })
          .eq("id", callId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Call assigned successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "list_engineers": {
        const limit = typeof args.limit === "number" ? args.limit : 50;
        let query = supabase
          .from("user_profiles")
          .select("*, banks(name)")
          .eq("role", "engineer")
          .order("full_name")
          .limit(limit);

        if (args.status) query = query.eq("status", args.status as string);
        if (args.bank_id) query = query.eq("bank_id", args.bank_id as string);

        const { data, error } = await query;
        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_engineer": {
        const engineerId = args.engineer_id as string;
        if (!engineerId) throw new Error("engineer_id is required");

        const { data, error } = await supabase
          .from("user_profiles")
          .select("*, banks(name)")
          .eq("id", engineerId)
          .single();

        if (error) throw error;

        // Get workload stats
        const { data: callStats } = await supabase
          .from("calls")
          .select("status")
          .eq("engineer_id", engineerId);

        const workload = {
          pending: callStats?.filter((c) => c.status === "assigned").length || 0,
          in_progress: callStats?.filter((c) => c.status === "in_progress").length || 0,
          completed_today: 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...data, workload }, null, 2),
            },
          ],
        };
      }

      case "list_banks": {
        const limit = typeof args.limit === "number" ? args.limit : 50;
        const { data, error } = await supabase
          .from("banks")
          .select("*")
          .order("name")
          .limit(limit);

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_dashboard_stats": {
        // Get device counts by status
        const { data: devices } = await supabase.from("devices").select("status");

        const deviceStats = {
          total: devices?.length || 0,
          warehouse: devices?.filter((d) => d.status === "warehouse").length || 0,
          issued: devices?.filter((d) => d.status === "issued").length || 0,
          installed: devices?.filter((d) => d.status === "installed").length || 0,
          faulty: devices?.filter((d) => d.status === "faulty").length || 0,
        };

        // Get call counts by status
        const { data: calls } = await supabase.from("calls").select("status, priority");

        const callStats = {
          total: calls?.length || 0,
          pending: calls?.filter((c) => c.status === "pending").length || 0,
          assigned: calls?.filter((c) => c.status === "assigned").length || 0,
          in_progress: calls?.filter((c) => c.status === "in_progress").length || 0,
          completed: calls?.filter((c) => c.status === "completed").length || 0,
          critical: calls?.filter((c) => c.priority === "critical").length || 0,
        };

        // Get engineer counts
        const { data: engineers } = await supabase
          .from("user_profiles")
          .select("status")
          .eq("role", "engineer");

        const engineerStats = {
          total: engineers?.length || 0,
          active: engineers?.filter((e) => e.status === "active").length || 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  devices: deviceStats,
                  calls: callStats,
                  engineers: engineerStats,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_stock_summary": {
        let query = supabase.from("devices").select("status, model, bank_id, banks(name)");

        if (args.bank_id) {
          query = query.eq("bank_id", args.bank_id as string);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by status and model
        const summary: Record<string, Record<string, number>> = {};
        data?.forEach((device: { status: string; model: string | null }) => {
          const status = device.status;
          const model = device.model || "Unknown";

          if (!summary[status]) {
            summary[status] = {};
          }
          summary[status][model] = (summary[status][model] || 0) + 1;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "search_devices": {
        const query = args.query as string;
        if (!query) throw new Error("query is required");

        const sanitizedQuery = sanitizeSearchInput(query);
        if (!sanitizedQuery) throw new Error("Invalid search query");

        const limit = typeof args.limit === "number" ? args.limit : 20;
        const { data, error } = await supabase
          .from("devices")
          .select("*")
          .or(`serial_number.ilike.%${sanitizedQuery}%,model.ilike.%${sanitizedQuery}%`)
          .limit(limit);

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_engineer_workload": {
        let query = supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("role", "engineer")
          .eq("status", "active");

        if (args.engineer_id) {
          query = query.eq("id", args.engineer_id as string);
        }

        const { data: engineers, error } = await query;
        if (error) throw error;

        const workloads = await Promise.all(
          (engineers || []).map(async (engineer) => {
            const { data: calls } = await supabase
              .from("calls")
              .select("status")
              .eq("engineer_id", engineer.id);

            return {
              engineer_id: engineer.id,
              full_name: engineer.full_name,
              assigned: calls?.filter((c) => c.status === "assigned").length || 0,
              in_progress: calls?.filter((c) => c.status === "in_progress").length || 0,
              completed: calls?.filter((c) => c.status === "completed").length || 0,
              total_active: calls?.filter((c) =>
                ["assigned", "in_progress"].includes(c.status)
              ).length || 0,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(workloads, null, 2),
            },
          ],
        };
      }

      case "update_call_status": {
        const callId = args.call_id as string;
        const status = args.status as string;

        if (!callId || !status) {
          throw new Error("call_id and status are required");
        }

        const updateData: { status: string; notes?: string } = { status };
        if (args.notes) {
          updateData.notes = args.notes as string;
        }

        const { data, error } = await supabase
          .from("calls")
          .update(updateData)
          .eq("id", callId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Call status updated successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "update_device_status": {
        const deviceId = args.device_id as string;
        const status = args.status as string;

        if (!deviceId || !status) {
          throw new Error("device_id and status are required");
        }

        const { data, error } = await supabase
          .from("devices")
          .update({ status })
          .eq("id", deviceId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Device status updated successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Resources - expose data as browsable resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "uds-pos://dashboard",
        name: "Dashboard Statistics",
        description: "Current dashboard KPIs and statistics",
        mimeType: "application/json",
      },
      {
        uri: "uds-pos://devices",
        name: "Device Inventory",
        description: "All POS devices in the system",
        mimeType: "application/json",
      },
      {
        uri: "uds-pos://calls/pending",
        name: "Pending Calls",
        description: "Service calls awaiting assignment",
        mimeType: "application/json",
      },
      {
        uri: "uds-pos://calls/active",
        name: "Active Calls",
        description: "Service calls currently in progress",
        mimeType: "application/json",
      },
      {
        uri: "uds-pos://engineers",
        name: "Engineers",
        description: "All field engineers",
        mimeType: "application/json",
      },
      {
        uri: "uds-pos://banks",
        name: "Banks",
        description: "All banks/organizations",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const supabase = getSupabaseClient();

  try {
    switch (uri) {
      case "uds-pos://dashboard": {
        const { data: devices } = await supabase.from("devices").select("status");
        const { data: calls } = await supabase.from("calls").select("status, priority");
        const { data: engineers } = await supabase
          .from("user_profiles")
          .select("status")
          .eq("role", "engineer");

        const stats = {
          devices: {
            total: devices?.length || 0,
            warehouse: devices?.filter((d) => d.status === "warehouse").length || 0,
            installed: devices?.filter((d) => d.status === "installed").length || 0,
            faulty: devices?.filter((d) => d.status === "faulty").length || 0,
          },
          calls: {
            total: calls?.length || 0,
            pending: calls?.filter((c) => c.status === "pending").length || 0,
            active: calls?.filter((c) =>
              ["assigned", "in_progress"].includes(c.status)
            ).length || 0,
            critical: calls?.filter((c) => c.priority === "critical").length || 0,
          },
          engineers: {
            total: engineers?.length || 0,
            active: engineers?.filter((e) => e.status === "active").length || 0,
          },
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "uds-pos://devices": {
        const { data, error } = await supabase
          .from("devices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "uds-pos://calls/pending": {
        const { data, error } = await supabase
          .from("calls")
          .select("*, banks(name)")
          .eq("status", "pending")
          .order("priority")
          .order("created_at");

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "uds-pos://calls/active": {
        const { data, error } = await supabase
          .from("calls")
          .select("*, banks(name), user_profiles(full_name)")
          .in("status", ["assigned", "in_progress"])
          .order("priority")
          .order("created_at");

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "uds-pos://engineers": {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*, banks(name)")
          .eq("role", "engineer")
          .order("full_name");

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "uds-pos://banks": {
        const { data, error } = await supabase
          .from("banks")
          .select("*")
          .order("name");

        if (error) throw error;

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource: ${message}`);
  }
});

// Prompts - pre-defined prompt templates
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "daily_summary",
        description: "Generate a daily summary of operations",
        arguments: [],
      },
      {
        name: "analyze_workload",
        description: "Analyze engineer workload distribution",
        arguments: [],
      },
      {
        name: "device_health_report",
        description: "Generate a device health and status report",
        arguments: [],
      },
      {
        name: "pending_calls_summary",
        description: "Summarize pending calls that need attention",
        arguments: [],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case "daily_summary":
      return {
        description: "Daily operations summary",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Please provide a daily summary of UDS-POS operations. Use the following tools to gather data:
1. Use get_dashboard_stats to get overall statistics
2. Use list_calls with status "pending" to see pending calls
3. Use get_engineer_workload to check engineer availability

Then provide a summary including:
- Total devices and their status distribution
- Number of pending, active, and completed calls today
- Engineer availability and workload
- Any critical issues that need attention`,
            },
          },
        ],
      };

    case "analyze_workload":
      return {
        description: "Engineer workload analysis",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Analyze the current workload distribution among engineers. Use get_engineer_workload to get data for all engineers.

Provide insights on:
- Which engineers are overloaded
- Which engineers have capacity for more calls
- Recommendations for better load balancing
- Any engineers who may need support`,
            },
          },
        ],
      };

    case "device_health_report":
      return {
        description: "Device health and status report",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Generate a device health report. Use list_devices and get_stock_summary to gather data.

Include in your report:
- Total device inventory
- Devices by status (warehouse, issued, installed, faulty)
- Faulty device rate and any patterns
- Stock levels and any potential shortages
- Recommendations for device management`,
            },
          },
        ],
      };

    case "pending_calls_summary":
      return {
        description: "Summary of pending calls",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Review all pending calls that need attention. Use list_calls with status "pending" to get the data.

Provide:
- Total number of pending calls
- Breakdown by priority (critical, high, medium, low)
- Breakdown by call type
- Oldest pending calls that may be overdue
- Recommendations for call assignment`,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UDS-POS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
