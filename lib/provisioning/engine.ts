import { db } from '@/lib/supabase/admin';
import { ProvisionRun } from './types';

export async function getProvisionRunBySlug(projectSlug: string): Promise<ProvisionRun | null> {
  return db.provision_runs.findFirst({
    where: { project_slug: projectSlug },
  }) as any;
}

export async function deleteProvisionRunBySlug(projectSlug: string): Promise<void> {
  await db.provision_runs.delete({
    where: { project_slug: projectSlug },
  });
}

export async function updateProvisionRun(
  projectSlug: string,
  patch: Partial<ProvisionRun>
) {
  await db.provision_runs.update({
    where: { project_slug: projectSlug },
    data: patch,
  });
}
