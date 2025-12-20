// web/src/app/(dashboard)/billing/page.tsx (server component)
import UpgradeButton from './UpgradeButton';

// πάρε το userId από το session σου
export default async function BillingPage() {
  const userId = 'USER_ID_FROM_SESSION'; // βάλε το δικό σου
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Αναβάθμιση σε VIP</h1>
      <p className="mb-3">10€/μήνα (auto-localized στο ταμείο)</p>
      <UpgradeButton userId={userId} />
    </main>
  );
}
