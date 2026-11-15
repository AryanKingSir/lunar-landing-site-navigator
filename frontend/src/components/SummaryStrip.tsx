import { useMemo, type CSSProperties } from 'react';
import { bestFlags } from '../lib/best';
import { dateLabel, pct, placeName } from '../lib/format';
import { summarize } from '../lib/summary';
import { useStore } from '../store';
import { Skeleton } from './Skeleton';

const LINK_TIP = 'Earth is in view and a Deep Space Network antenna can see the Moon (direct-to-Earth, DTE).';

const ROWS = [
  { key: 'sunPct', label: 'Sunlight', tip: undefined },
  { key: 'earthPct', label: 'Earth in view', tip: undefined },
  { key: 'linkPct', label: 'Radio link to Earth', tip: LINK_TIP },
] as const;

/** One column per site: three key figures and a plain sentence. Never reads the playback time. */
export function SummaryStrip() {
  const scenarios = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);

  const sums = useMemo(
    () => scenarios.map((sc) => (sc.result ? summarize(sc.result, sc.days) : undefined)),
    [scenarios],
  );
  const best = useMemo(
    () => ROWS.map((r) => bestFlags(sums.map((s) => s?.[r.key]))),
    [sums],
  );
  const showDates = new Set(scenarios.map((s) => placeName(s.label))).size < scenarios.length;

  if (scenarios.length === 0) return <section className="summary-strip" data-tour="summary" aria-label="Summary" />;
  return (
    <section className="summary-strip" data-tour="summary" aria-label="Summary" data-cols={scenarios.length}
             style={{ '--cols': scenarios.length } as CSSProperties}>
      {scenarios.map((sc, i) => {
        const sum = sums[i];
        const name = placeName(sc.label);
        const failed = !!sc.error && !sc.loading;
        return (
          <section key={sc.id} className={`sum-col ${sc.id === activeId ? 'active' : ''}`} style={{ '--c': sc.color } as CSSProperties}
                   aria-label={`Site ${sc.tag}, ${name}`}>
            <button type="button" className="sum-hit" aria-pressed={sc.id === activeId}
                    aria-label={`Show ${name} in the views below`} onClick={() => setActive(sc.id)} />
            {sum ? (
              <>
                <div className="sum-top">
                <div className="sum-head">
                  <span className="tag">{sc.tag}</span>
                  <span className="sum-id">
                    <span className="sum-name">{name}</span>
                    {showDates && <span className="sum-date num">{dateLabel(sc.start)}</span>}
                  </span>
                </div>
                <dl className="sum-figs">
                  {ROWS.map((r, ri) => (
                    <div key={r.key} className="sum-fig">
                      <dt>{r.tip ? <abbr title={r.tip} tabIndex={0}>{r.label}</abbr> : r.label}</dt>
                      <dd className="num">{pct(sum[r.key])}{best[ri][i] && <span className="most">most<span className="sr-only"> ({r.label}: highest of the sites shown)</span></span>}</dd>
                    </div>
                  ))}
                </dl>
                </div>
                <p className="sum-sentence">{sum.sentence}</p>
              </>
            ) : (
              <>
                <div className="sum-head">
                  <span className="tag">{sc.tag}</span>
                  <span className="sum-id">
                    <span className="sum-name">{name}</span>
                    {showDates && <span className="sum-date num">{dateLabel(sc.start)}</span>}
                  </span>
                </div>
                {failed ? (
                  <p className="sum-sentence error">Could not work this out. Use Try again on the site chip.</p>
                ) : (
              <span className="sum-skel" role="status">
                <span className="sr-only">Working out {name}</span>
                <Skeleton w="70%" h={16} /><Skeleton w="60%" h={16} /><Skeleton w="65%" h={16} />
                <Skeleton w="95%" h={12} /><Skeleton w="75%" h={12} />
              </span>
                )}
              </>
            )}
          </section>
        );
      })}
    </section>
  );
}
