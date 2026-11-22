import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RotateCcw } from 'lucide-react';
import { errorMessage } from '../api';
import { useApp } from '../context';
import { resumeHref } from '../resume';
import { createTheoryAttempt, theoryReviewTitle } from '../theory-review';
import { ErrorNotice } from './common';

export function TheoryReviewButton({ questionIds }: { questionIds: string[] }) {
  const { level } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const attempt = await createTheoryAttempt(
        { mode: 'trening', questionIds, level },
        theoryReviewTitle,
      );
      navigate(resumeHref(attempt));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button className="button secondary" disabled={busy} onClick={() => void start()}>
        {busy ? (
          <Loader2 className="spin" size={17} aria-hidden />
        ) : (
          <RotateCcw size={17} aria-hidden />
        )}
        Powtórz błędy
      </button>
      <ErrorNotice message={error} />
    </div>
  );
}
