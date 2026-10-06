import growth from "@/shared/jt-growth-workspaces.json";

export function getJtGeoDestination(domain?: string | null) {
  let hostname = "";
  try {
    const url = new URL(
      domain?.includes("://") ? domain : `https://${domain ?? ""}`,
    );
    if (url.protocol === "https:" || url.protocol === "http:") {
      hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    }
  } catch {
    // A missing or invalid website must open the chooser, never another client.
  }
  const match = growth.projects.find((project) => project.domain === hostname);
  const destination = new URL(match ? "/" : "/portfolio", growth.geoDashboard);
  if (match) destination.searchParams.set("workspace", match.geoWorkspaceId);
  return { href: destination.href, matched: Boolean(match) };
}
