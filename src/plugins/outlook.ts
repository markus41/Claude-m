import { z } from "zod";
import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

/** Argument schemas for each Outlook tool. */
const SendEmailArgs = z.object({
  to: z.array(z.string().email()).describe("Recipient email addresses"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("HTML or plain-text body"),
  cc: z.array(z.string().email()).optional().describe("CC email addresses"),
  isHtml: z.boolean().default(true).describe("Whether the body is HTML"),
});

const ListEmailsArgs = z.object({
  top: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .describe("Maximum number of emails to return"),
  filter: z.string().optional().describe("OData $filter expression"),
});

const CreateEventArgs = z.object({
  subject: z.string().describe("Event subject"),
  startDateTime: z.string().describe("ISO-8601 start date-time"),
  endDateTime: z.string().describe("ISO-8601 end date-time"),
  attendees: z
    .array(z.string().email())
    .optional()
    .describe("Attendee email addresses"),
  location: z.string().optional().describe("Location string"),
  body: z.string().optional().describe("Optional event description (HTML)"),
});

const ListEventsArgs = z.object({
  top: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .describe("Maximum number of events to return"),
});

/**
 * Microsoft Outlook plugin.
 *
 * Exposes tools:
 *  - outlook_send_email   – Send an email via the current user's mailbox
 *  - outlook_list_emails  – List recent messages in the inbox
 *  - outlook_create_event – Create a calendar event
 *  - outlook_list_events  – List upcoming calendar events
 */
export class OutlookPlugin extends BasePlugin {
  constructor(auth: PluginAuth) {
    super(auth);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<PluginResult> {
    try {
      switch (toolName) {
        case "outlook_send_email": {
          const { to, subject, body, cc, isHtml } = SendEmailArgs.parse(args);
          const url = `${GRAPH}/me/sendMail`;
          await this.graphPost(url, {
            message: {
              subject,
              body: {
                contentType: isHtml ? "HTML" : "Text",
                content: body,
              },
              toRecipients: to.map((addr) => ({
                emailAddress: { address: addr },
              })),
              ccRecipients: (cc ?? []).map((addr) => ({
                emailAddress: { address: addr },
              })),
            },
          });
          return this.ok({ sent: true });
        }

        case "outlook_list_emails": {
          const { top, filter } = ListEmailsArgs.parse(args);
          let url = `${GRAPH}/me/mailFolders/inbox/messages?$top=${top}&$orderby=receivedDateTime desc`;
          if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "outlook_create_event": {
          const { subject, startDateTime, endDateTime, attendees, location, body } =
            CreateEventArgs.parse(args);
          const url = `${GRAPH}/me/events`;
          const data = await this.graphPost(url, {
            subject,
            start: { dateTime: startDateTime, timeZone: "UTC" },
            end: { dateTime: endDateTime, timeZone: "UTC" },
            location: location ? { displayName: location } : undefined,
            body: body
              ? { contentType: "HTML", content: body }
              : undefined,
            attendees: (attendees ?? []).map((email) => ({
              emailAddress: { address: email },
              type: "required",
            })),
          });
          return this.ok(data);
        }

        case "outlook_list_events": {
          const { top } = ListEventsArgs.parse(args);
          const now = new Date().toISOString();
          const url = `${GRAPH}/me/calendarView?startDateTime=${now}&endDateTime=2099-12-31T23:59:59Z&$top=${top}&$orderby=start/dateTime`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        default:
          return this.fail(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : String(err));
    }
  }
}
