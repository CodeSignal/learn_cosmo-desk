import { useEffect, useState } from 'react';

import { progress } from '../shared/work.js';
import { CaseDetail } from './components/CaseDetail.jsx';
import { Guide } from './components/Guide.jsx';
import { Header } from './components/Header.jsx';
import { Help } from './components/Help.jsx';
import { QueueList, isOpenStatus } from './components/QueueList.jsx';
import { api } from './lib/api.js';
import { caseStatus } from './lib/status.js';
import { useMediaQuery } from './lib/useMediaQuery.js';
import { useResizableWidth } from './lib/useResizableWidth.js';
import { useWork } from './lib/useWork.js';

export function App() {
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.config(), api.work()])
      .then(([config, work]) => {
        if (!cancelled) setLoaded({ config, work });
      })
      .catch((error) => {
        console.error('Loading the task failed:', error);
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <main className="cd-state" role="alert">
        <h1 className="heading-xxsmall">This task could not be loaded</h1>
        <p className="body-small">{loadError}</p>
        <p className="body-small">Reload the preview. If it keeps happening, contact support.</p>
      </main>
    );
  }
  if (!loaded) {
    return (
      <main className="cd-state" aria-busy="true">
        <p className="body-small">Loading the queue…</p>
      </main>
    );
  }
  return <Desk config={loaded.config} initialWork={loaded.work} />;
}

function Desk({ config, initialWork }) {
  const { work, saveState, updateCase, retry, resetWork } = useWork(initialWork);
  const narrow = useMediaQuery('(max-width: 759px)');
  const listPanel = useResizableWidth({ storageKey: 'cosmo-desk.list-width', initial: 320, min: 240, max: 560, edge: 'right' });
  const guidePanel = useResizableWidth({ storageKey: 'cosmo-desk.guide-width', initial: 440, min: 300, max: 820, edge: 'left' });
  const [selectedId, setSelectedId] = useState(config.cases[0].id);
  const [narrowShowsDetail, setNarrowShowsDetail] = useState(false);
  const [filter, setFilter] = useState(() =>
    config.cases.some((item) => isOpenStatus(caseStatus(initialWork.cases[item.id]))) ? 'todo' : 'all'
  );
  const [guideOpen, setGuideOpen] = useState(() => window.matchMedia('(min-width: 1360px)').matches);
  const [guideFocus, setGuideFocus] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [listFocusRequest, setListFocusRequest] = useState(0);
  const [detailFocusRequest, setDetailFocusRequest] = useState(0);

  useEffect(() => {
    if (detailFocusRequest > 0) document.querySelector('.cd-detail-title')?.focus();
  }, [detailFocusRequest]);


  const ids = config.cases.map((item) => item.id);
  const index = Math.max(0, ids.indexOf(selectedId));
  const selected = config.cases[index];
  const openIds = config.cases
    .filter((item) => isOpenStatus(caseStatus(work.cases[item.id])))
    .map((item) => item.id);
  const nextOpenId =
    openIds.find((id) => ids.indexOf(id) > index) ?? openIds.find((id) => id !== selected.id);

  function selectCase(caseId, { keepList = false, focusDetail = false } = {}) {
    setSelectedId(caseId);
    if (!keepList) setNarrowShowsDetail(true);
    if (focusDetail || (narrow && !keepList)) setDetailFocusRequest((count) => count + 1);
  }

  function backToList() {
    setNarrowShowsDetail(false);
    setListFocusRequest((count) => count + 1);
  }

  function showGuide(sectionId) {
    setGuideFocus(sectionId ? { id: sectionId, at: Date.now() } : null);
    setGuideOpen(true);
  }

  function toggleGuide() {
    setGuideFocus(null);
    setGuideOpen((open) => !open);
  }

  async function startOver() {
    try {
      await resetWork();
      setSelectedId(config.cases[0].id);
      setNarrowShowsDetail(false);
      setFilter('todo');
      setHelpOpen(false);
    } catch (error) {
      console.error('Resetting the work failed:', error);
      window.alert(`Could not start over: ${error.message}`);
    }
  }

  const replyRulesId = config.guide.sections.find((section) => section.replyRules)?.id ?? null;

  return (
    <div className="cd-app">
      <Header
        desk={config.desk}
        counts={progress(config, work)}
        guideOpen={guideOpen}
        onToggleGuide={toggleGuide}
        saveState={saveState}
        onRetry={() => void retry()}
        onHelp={() => setHelpOpen(true)}
      />
      <main
        className={`cd-queue${narrowShowsDetail ? ' cd-show-detail' : ''}${
          guideOpen ? ' cd-with-guide' : ''
        }`}
        style={{ '--cd-list-width': `${listPanel.width}px`, '--cd-guide-width': `${guidePanel.width}px` }}
      >
          <QueueList
            resizeHandle={<div className="cd-resize-handle cd-resize-right" aria-label="Resize the case queue" {...listPanel.handleProps} />}
            cases={config.cases}
            fields={config.fields}
            work={work}
            selectedId={selected.id}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={selectCase}
            focusRequest={listFocusRequest}
          />
          <CaseDetail
            key={selected.id}
            item={selected}
            position={{
              index,
              total: ids.length,
              hasNext: index < ids.length - 1,
              onNextInQueue: () => selectCase(ids[index + 1], { focusDetail: true }),
            }}
            cases={config.cases}
            fields={config.fields}
            work={work}
            onChange={(patch, options) => updateCase(selected.id, patch, options)}
            onBack={backToList}
            onPrevious={index > 0 ? () => selectCase(ids[index - 1], { focusDetail: true }) : null}
            onNext={nextOpenId ? () => selectCase(nextOpenId, { focusDetail: true }) : null}
            nextLabel="Next open case"
            allDone={openIds.length === 0}
            onShowReplyRules={() => showGuide(replyRulesId)}
          />
          {guideOpen && (
            <aside className="cd-guide-panel" aria-label={config.guide.title}>
              <div className="cd-resize-handle cd-resize-left" aria-label="Resize the routing guide" {...guidePanel.handleProps} />
              <div className="cd-guide-scroll">
                <Guide
                  guide={config.guide}
                  compact
                  focus={guideFocus}
                  onClose={() => setGuideOpen(false)}
                />
              </div>
            </aside>
          )}
      </main>
      <Help
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        desk={config.desk}
        fields={config.fields}
        onStartOver={startOver}
      />
    </div>
  );
}
