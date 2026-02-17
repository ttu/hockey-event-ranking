import { useEffect, useRef } from 'react';

const GITHUB_URL = 'https://github.com/ttu/hockey-event-ranking';

export interface InfoViewProps {
  onClose: () => void;
}

export function InfoView({ onClose }: InfoViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="info-view__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-view-title"
    >
      <div className="info-view__backdrop" onClick={onClose} aria-hidden />
      <div className="info-view__popup">
        <div className="info-view__header">
          <h2 id="info-view-title">About Hockey Event Ranking</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="info-view__close"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="info-view__body">
          <section>
            <h3>Purpose</h3>
            <p>
              Compare national hockey teams for international competitions
              (Olympics, World Championship). Teams are ranked by total roster
              value (salary sum) or by a weighted player score based on league,
              lineup, and role.
            </p>
          </section>

          <section>
            <h3>Player Score</h3>
            <p>Each player receives a score 0–100 from three factors:</p>
            <ul className="info-view__score-factors">
              <li>
                <strong>League tier (40%)</strong>
                <br />
                NHL=1.0, KHL≈0.7, SHL/Liiga≈0.5, etc.
              </li>
              <li>
                <strong>Line (35%)</strong>
                <ul>
                  <li>Forwards: 1st Line → 2nd → 3rd → 4th</li>
                  <li>Defense: Top 4 D → Bottom Pair</li>
                  <li>Goalies: Starter → Backup</li>
                </ul>
              </li>
              <li>
                <strong>Role (25%)</strong>
                <ul>
                  <li>Forwards: Top 6 → Bottom 6</li>
                  <li>Defense: Top 4 D → Bottom Pair</li>
                  <li>Goalies: Starter → Backup</li>
                </ul>
              </li>
            </ul>
            <p>
              <strong>Total team score</strong> = sum of player scores.
              <strong> Average score</strong> = total ÷ player count.
            </p>
          </section>

          <section>
            <h3>Salary &amp; Estimates</h3>
            <p>
              <strong>Absolute value</strong> = sum of yearly salaries (USD).
              For NHL players, salaries are from public data when available. For
              European leagues (KHL, SHL, Liiga, etc.), salaries are often
              estimated from league averages — these are marked with * in the
              roster.
            </p>
          </section>

          <section>
            <h3>Data</h3>
            <p>
              Roster data is AI-generated using web scraping and scripts, stored
              as JSON in{' '}
              <code>public/data/competitions/&#123;competition&#125;.json</code>{' '}
              +{' '}
              <code>
                competitions/&#123;competition&#125;/&#123;teamId&#125;.json
              </code>
              . An optional <code>overrides.json</code> per competition allows
              manual corrections; overrides are always applied and never
              overwritten by generated data. Run{' '}
              <code>npm run update-data</code> to validate or regenerate sample
              data.
            </p>
            <p>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                {GITHUB_URL}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
