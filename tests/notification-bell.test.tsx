/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "@/modules/notifications/ui/NotificationBell";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockFetch = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
  }),
}));

vi.mock("@/modules/notifications/actions/notification.actions", () => ({
  fetchNotificationsAction: (...args: unknown[]) => mockFetch(...args),
  markNotificationReadAction: (...args: unknown[]) => mockMarkRead(...args),
  markAllNotificationsReadAction: (...args: unknown[]) => mockMarkAllRead(...args),
}));

const sampleItem = {
  notificationId: "n-1",
  eventType: "debt_case_returned",
  titleHe: "השלמת תיק",
  bodyHe: "תיק הוחזר",
  entityType: "debt_case",
  entityId: "case-1",
  destinationPath: "/app/buildings/b-1/debt-cases/case-1",
  readAtIso: null as string | null,
  createdAtIso: "2026-01-01T10:00:00.000Z",
};

function openBellTrigger(unreadCount: number) {
  const label =
    unreadCount > 0 ? `${unreadCount} התראות שלא נקראו` : "אין התראות שלא נקראו";
  return screen.getByRole("button", { name: label });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, items: [sampleItem], unreadCount: 1 });
    mockMarkRead.mockResolvedValue({ ok: true });
    mockMarkAllRead.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("opens popover and loads notifications without router updates", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<NotificationBell initialUnreadCount={1} fullListHref="/app/notifications" />);

    fireEvent.click(openBellTrigger(1));

    const panel = screen.getByRole("region", { name: "התראות" });
    expect(panel).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(15);
    });

    expect(within(panel).getByText("תיק הוחזר")).toBeTruthy();

    const routerWarnings = consoleError.mock.calls.filter((call) =>
      String(call[0]).includes("Cannot update a component (`Router`)"),
    );
    expect(routerWarnings).toHaveLength(0);

    consoleError.mockRestore();
  });

  it("marks one notification read and navigates from click handler", async () => {
    render(<NotificationBell initialUnreadCount={1} fullListHref="/app/notifications" />);
    fireEvent.click(openBellTrigger(1));
    const panel = await screen.findByRole("region", { name: "התראות" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    fireEvent.click(within(panel).getByRole("button", { name: /השלמת תיק/ }));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith("n-1");
      expect(mockPush).toHaveBeenCalledWith("/app/buildings/b-1/debt-cases/case-1");
    });
  });

  it("mark all read clears badge without navigation", async () => {
    mockFetch.mockResolvedValue({ ok: true, items: [sampleItem], unreadCount: 2 });

    render(<NotificationBell initialUnreadCount={2} fullListHref="/app/notifications" />);
    fireEvent.click(openBellTrigger(2));
    const panel = await screen.findByRole("region", { name: "התראות" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    fireEvent.click(within(panel).getByRole("button", { name: "סימון הכל כנקרא" }));

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByText("2", { selector: "span" })).toBeNull();
  });

  it("can close and reopen popover and refetch", async () => {
    render(<NotificationBell initialUnreadCount={0} fullListHref="/app/notifications" />);
    const trigger = openBellTrigger(0);

    fireEvent.click(trigger);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "התראות" })).toBeNull();

    fireEvent.click(trigger);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
