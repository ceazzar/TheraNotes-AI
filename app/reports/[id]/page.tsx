import { WorkspaceLayout } from "@/components/workspace/workspace-layout";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;

  return <WorkspaceLayout reportId={id} />;
}

export function generateMetadata() {
  return {
    title: "Workspace | TheraNotes AI",
    description: "Edit and refine your Functional Capacity Assessment report",
  };
}
