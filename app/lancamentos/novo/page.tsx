import { createRelease } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { getAvailableDistributionPlatforms } from "../../lib/distribution-platform-options";
import { ReleaseForm } from "./release-form";

export const dynamic = "force-dynamic";

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [, params, platforms] = await Promise.all([
    requireUser(),
    searchParams,
    getAvailableDistributionPlatforms(),
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Novo lancamento"
        title="Distribuir musica"
        description="Monte um pacote profissional com metadados, arquivos, direitos e validacao operacional antes do envio."
      />

      <ReleaseForm platforms={platforms} erroParam={params.erro} />
    </AppShell>
  );
}
