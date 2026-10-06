import { useQuery } from "@tanstack/react-query";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { getJtGeoDestination } from "@/client/lib/jt-growth";

export function JTGrowthSwitch({
  projectId,
  ready,
}: {
  projectId?: string;
  ready: boolean;
}) {
  const projects = useQuery({
    ...projectsQueryOptions(),
    enabled: ready && Boolean(projectId),
  });
  const project = projects.data?.find((item) => item.id === projectId);
  const destination = getJtGeoDestination(project?.domain);

  return (
    <nav
      aria-label="JT Growth dashboards"
      className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2 text-xs"
    >
      <span className="font-semibold text-foreground">JT Growth</span>
      <span
        aria-current="page"
        className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
      >
        SEO
      </span>
      <a
        href={destination.href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        title="Opens JT GEO in a new tab, keeping your SEO work open"
      >
        GEO / AEO ↗
      </a>
      <span className="text-muted-foreground">
        {destination.matched
          ? `${project?.name} · same website`
          : "Choose a GEO website"}
      </span>
    </nav>
  );
}
