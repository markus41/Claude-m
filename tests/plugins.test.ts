import { TeamsPlugin } from "../src/plugins/teams.js";
import { ExcelPlugin } from "../src/plugins/excel.js";
import { OutlookPlugin } from "../src/plugins/outlook.js";
import { AzurePlugin } from "../src/plugins/azure.js";
import { SharePointPlugin } from "../src/plugins/sharepoint.js";

/** Stub fetch so no real HTTP calls are made. */
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function mockError(status: number, text: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => text,
    json: async () => ({}),
  });
}

const AUTH = {
  clientId: "client-id",
  clientSecret: "client-secret",
  tenantId: "tenant-id",
  accessToken: "test-token",
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

describe("TeamsPlugin", () => {
  const plugin = new TeamsPlugin(AUTH);

  test("teams_list_teams calls /me/joinedTeams", async () => {
    const payload = { value: [{ id: "t1", displayName: "Engineering" }] };
    mockOk(payload);
    const result = await plugin.callTool("teams_list_teams", {});
    expect(result.success).toBe(true);
    expect(result.data).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/joinedTeams"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-token" }) })
    );
  });

  test("teams_list_channels calls correct URL", async () => {
    const payload = { value: [{ id: "c1", displayName: "General" }] };
    mockOk(payload);
    const result = await plugin.callTool("teams_list_channels", { teamId: "t1" });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/teams/t1/channels"),
      expect.anything()
    );
  });

  test("teams_send_message POSTs to correct URL", async () => {
    const payload = { id: "m1" };
    mockOk(payload);
    const result = await plugin.callTool("teams_send_message", {
      teamId: "t1",
      channelId: "c1",
      message: "Hello!",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/teams/t1/channels/c1/messages"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("teams_create_meeting POSTs to /me/onlineMeetings", async () => {
    const payload = { id: "meet1", joinWebUrl: "https://teams.example.com/meet" };
    mockOk(payload);
    const result = await plugin.callTool("teams_create_meeting", {
      subject: "Standup",
      startDateTime: "2026-01-01T09:00:00Z",
      endDateTime: "2026-01-01T09:30:00Z",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/onlineMeetings"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("returns failure on HTTP error", async () => {
    mockError(403, "Forbidden");
    const result = await plugin.callTool("teams_list_teams", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
  });

  test("returns failure for unknown tool", async () => {
    const result = await plugin.callTool("teams_unknown", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool");
  });
});

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

describe("ExcelPlugin", () => {
  const plugin = new ExcelPlugin(AUTH);

  test("excel_list_worksheets calls workbook endpoint", async () => {
    const payload = { value: [{ name: "Sheet1" }] };
    mockOk(payload);
    const result = await plugin.callTool("excel_list_worksheets", {
      driveItemId: "item1",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/workbook/worksheets"),
      expect.anything()
    );
  });

  test("excel_read_range calls range endpoint", async () => {
    const payload = { values: [["A", "B"], [1, 2]] };
    mockOk(payload);
    const result = await plugin.callTool("excel_read_range", {
      driveItemId: "item1",
      worksheet: "Sheet1",
      range: "A1:B2",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("Sheet1"),
      expect.anything()
    );
  });

  test("excel_write_range sends PATCH", async () => {
    const payload = { values: [["X"]] };
    mockOk(payload);
    const result = await plugin.callTool("excel_write_range", {
      driveItemId: "item1",
      worksheet: "Sheet1",
      range: "A1:A1",
      values: [["X"]],
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "PATCH" })
    );
  });

  test("excel_create_table calls tables/add", async () => {
    const payload = { id: "table1" };
    mockOk(payload);
    const result = await plugin.callTool("excel_create_table", {
      driveItemId: "item1",
      worksheet: "Sheet1",
      range: "A1:D10",
      hasHeaders: true,
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("tables/add"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

// ---------------------------------------------------------------------------
// Outlook
// ---------------------------------------------------------------------------

describe("OutlookPlugin", () => {
  const plugin = new OutlookPlugin(AUTH);

  test("outlook_send_email calls /me/sendMail", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => null, text: async () => "" });
    const result = await plugin.callTool("outlook_send_email", {
      to: ["recipient@example.com"],
      subject: "Hello",
      body: "<p>Test</p>",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/sendMail"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("outlook_list_emails calls inbox messages endpoint", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("outlook_list_emails", {});
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/mailFolders/inbox/messages"),
      expect.anything()
    );
  });

  test("outlook_create_event calls /me/events", async () => {
    const payload = { id: "event1" };
    mockOk(payload);
    const result = await plugin.callTool("outlook_create_event", {
      subject: "Meeting",
      startDateTime: "2026-06-01T10:00:00Z",
      endDateTime: "2026-06-01T11:00:00Z",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/me/events"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("outlook_list_events calls calendarView endpoint", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("outlook_list_events", {});
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("calendarView"),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// Azure
// ---------------------------------------------------------------------------

describe("AzurePlugin", () => {
  const plugin = new AzurePlugin(AUTH);

  test("azure_list_subscriptions calls ARM endpoint", async () => {
    const payload = { value: [{ subscriptionId: "sub1" }] };
    mockOk(payload);
    const result = await plugin.callTool("azure_list_subscriptions", {});
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("management.azure.com/subscriptions"),
      expect.anything()
    );
  });

  test("azure_list_resource_groups calls correct URL", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("azure_list_resource_groups", {
      subscriptionId: "sub1",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/subscriptions/sub1/resourcegroups"),
      expect.anything()
    );
  });

  test("azure_list_resources calls correct URL", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("azure_list_resources", {
      subscriptionId: "sub1",
      resourceGroup: "rg1",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/resourceGroups/rg1/resources"),
      expect.anything()
    );
  });

  test("azure_get_resource calls correct URL", async () => {
    const payload = { id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1" };
    mockOk(payload);
    const result = await plugin.callTool("azure_get_resource", {
      subscriptionId: "sub1",
      resourceGroup: "rg1",
      provider: "Microsoft.Compute",
      resourceType: "virtualMachines",
      resourceName: "vm1",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("Microsoft.Compute/virtualMachines/vm1"),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// SharePoint
// ---------------------------------------------------------------------------

describe("SharePointPlugin", () => {
  const plugin = new SharePointPlugin(AUTH);

  test("sharepoint_list_sites calls /sites?search=*", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("sharepoint_list_sites", {});
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/sites?search=*"),
      expect.anything()
    );
  });

  test("sharepoint_list_files calls /children endpoint", async () => {
    const payload = { value: [] };
    mockOk(payload);
    const result = await plugin.callTool("sharepoint_list_files", {
      siteId: "site1",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/children"),
      expect.anything()
    );
  });

  test("sharepoint_upload_file sends PUT", async () => {
    const payload = { id: "file1" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    });
    const result = await plugin.callTool("sharepoint_upload_file", {
      siteId: "site1",
      fileName: "test.txt",
      content: Buffer.from("hello").toString("base64"),
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("test.txt"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  test("sharepoint_download_file returns downloadUrl", async () => {
    const payload = {
      id: "file1",
      "@microsoft.graph.downloadUrl": "https://example.com/file.txt",
    };
    mockOk(payload);
    const result = await plugin.callTool("sharepoint_download_file", {
      siteId: "site1",
      itemId: "file1",
    });
    expect(result.success).toBe(true);
    expect((result.data as { downloadUrl: string }).downloadUrl).toBe(
      "https://example.com/file.txt"
    );
  });
});

// ---------------------------------------------------------------------------
// Missing access token
// ---------------------------------------------------------------------------

describe("BasePlugin – missing access token", () => {
  test("throws when accessToken is not provided", async () => {
    const noTokenAuth = { clientId: "", clientSecret: "", tenantId: "" };
    const plugin = new TeamsPlugin(noTokenAuth);
    const result = await plugin.callTool("teams_list_teams", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("No accessToken");
  });
});
