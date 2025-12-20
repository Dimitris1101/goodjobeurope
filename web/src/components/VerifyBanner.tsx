'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function VerifyBanner() {
  const [msg, setMsg] = useState<string | null>(null);

  const resend = async () => {
    try {
      await api.post('/auth/send-verify');
      setMsg('Στάλθηκε νέος σύνδεσμος επιβεβαίωσης (δες MailHog).');
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Αποτυχία αποστολής');
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm">
        Ο λογαριασμός σου δεν έχει επιβεβαιωθεί. Έλεγξε το email σου &nbsp;
        ή
        <button onClick={resend} className="ml-1 underline">
          Ξαναστείλε επιβεβαίωση
        </button>
      </p>
      {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
