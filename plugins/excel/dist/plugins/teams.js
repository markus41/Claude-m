import { z } from "zod";
import { BasePlugin } from "./base.js";
const GRAPH = "https://graph.microsoft.com/v1.0";
/** Argument schemas for each Teams tool. */
const SendMessageArgs = z.object({
    teamId: z.string().describe("The ID of the target team"),
    channelId: z.string().describe("The ID of the target channel"),
    message: z.string().describe("Plain-text or HTML message content"),
});
const CreateMeetingArgs = z.object({
    subject: z.string().describe("Meeting subject"),
    startDateTime: z.string().describe("ISO-8601 start date-time"),
    endDateTime: z.string().describe("ISO-8601 end date-time"),
    attendees: z
        .array(z.string().email())
        .optional()
        .describe("List of attendee email addresses"),
});
const ListChannelsArgs = z.object({
    teamId: z.string().describe("The ID of the team"),
});
/**
 * Microsoft Teams plugin.
 *
 * Exposes tools:
 *  - teams_send_message    – Post a message to a channel
 *  - teams_create_meeting  – Create an online meeting
 *  - teams_list_channels   – List channels in a team
 *  - teams_list_teams      – List joined teams for the current user
 */
export class TeamsPlugin extends BasePlugin {
    constructor(auth) {
        super(auth);
    }
    async callTool(toolName, args) {
        try {
            switch (toolName) {
                case "teams_send_message": {
                    const { teamId, channelId, message } = SendMessageArgs.parse(args);
                    const url = `${GRAPH}/teams/${teamId}/channels/${channelId}/messages`;
                    const data = await this.graphPost(url, {
                        body: { contentType: "html", content: message },
                    });
                    return this.ok(data);
                }
                case "teams_create_meeting": {
                    const { subject, startDateTime, endDateTime, attendees } = CreateMeetingArgs.parse(args);
                    const url = `${GRAPH}/me/onlineMeetings`;
                    const data = await this.graphPost(url, {
                        subject,
                        startDateTime,
                        endDateTime,
                        participants: {
                            attendees: (attendees ?? []).map((email) => ({
                                identity: { user: { id: email } },
                            })),
                        },
                    });
                    return this.ok(data);
                }
                case "teams_list_channels": {
                    const { teamId } = ListChannelsArgs.parse(args);
                    const url = `${GRAPH}/teams/${teamId}/channels`;
                    const data = await this.graphGet(url);
                    return this.ok(data);
                }
                case "teams_list_teams": {
                    const url = `${GRAPH}/me/joinedTeams`;
                    const data = await this.graphGet(url);
                    return this.ok(data);
                }
                default:
                    return this.fail(`Unknown tool: ${toolName}`);
            }
        }
        catch (err) {
            return this.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
//# sourceMappingURL=teams.js.map