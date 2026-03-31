import React, { useEffect, useState, useRef, useContext } from 'react';
import { Plus, CheckCircle, XCircle, Minus, Camera, Trash2, ChevronDown, ChevronUp, ClipboardCheck, AlertCircle } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const API_BASE = '';

const SECTION_COLORS = {
  '1S': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Сортировка' },
  '2S': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Систематизация' },
  '3S': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Содержание' },
  '4S': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Стандартизация' },
  '5S': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Совершенствование' }
};

const STATUS_CONFIG = {
  ok: { icon: CheckCircle, color: '#22c55e', label: 'Выполнено', bg: 'rgba(34,197,94,0.12)' },
  issue: { icon: XCircle, color: '#ef4444', label: 'Нарушение', bg: 'rgba(239,68,68,0.12)' },
  na: { icon: Minus, color: '#64748b', label: 'Не проверено', bg: 'rgba(100,116,139,0.08)' }
};

const ScoreBadge = ({ pct }) => {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ fontWeight: 700, fontSize: '1rem', color }}>
      {pct}%
    </span>
  );
};

const ChecklistPage = () => {
  const { user } = useContext(AuthContext);
  const [view, setView] = useState('list'); // 'list' | 'session'
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sections, setSections] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoModal, setPhotoModal] = useState(null); // { response, src }
  const [newArea, setNewArea] = useState('Производственный цех');
  const fileInputRefs = useRef({});

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/checklist/sessions');
      setSessions(res.data || res);
    } catch (e) {
      setError('Не удалось загрузить список проверок');
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (id) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/checklist/sessions/${id}`);
      const { session, sections: secs } = res.data || res;
      setCurrentSession(session);
      setSections(secs || []);
      setView('session');
      // Collapse all by default except first
      const collapsed = {};
      secs?.forEach((s, i) => { if (i > 0) collapsed[s.section] = true; });
      setCollapsedSections(collapsed);
    } catch (e) {
      setError('Не удалось загрузить проверку');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      setSaving(true);
      const res = await api.post('/checklist/sessions', { userId: user?.id, area: newArea });
      const session = res.data || res;
      await loadSession(session.id);
      await loadSessions();
    } catch (e) {
      setError('Не удалось создать проверку');
    } finally {
      setSaving(false);
    }
  };

  const updateResponse = async (responseId, status, comment) => {
    try {
      const res = await api.put(`/checklist/responses/${responseId}`, { status, comment });
      const updated = res.data || res;
      // Update locally
      setSections(prev => prev.map(sec => ({
        ...sec,
        items: sec.items.map(item =>
          item.id === responseId ? { ...item, status: updated.status, comment: updated.comment } : item
        )
      })));
      // Refresh session score
      const sessionRes = await api.get(`/checklist/sessions/${currentSession.id}`);
      setCurrentSession(sessionRes.data?.session || sessionRes.session || currentSession);
    } catch (e) {
      setError('Ошибка сохранения');
    }
  };

  const uploadPhoto = async (responseId, file) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_BASE}/api/checklist/responses/${responseId}/photo`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const updated = data.data;
      setSections(prev => prev.map(sec => ({
        ...sec,
        items: sec.items.map(item =>
          item.id === responseId ? { ...item, photo_path: updated.photo_path } : item
        )
      })));
    } catch (e) {
      setError('Ошибка загрузки фото');
    }
  };

  const deletePhoto = async (responseId) => {
    try {
      await fetch(`${API_BASE}/api/checklist/responses/${responseId}/photo`, { method: 'DELETE' });
      setSections(prev => prev.map(sec => ({
        ...sec,
        items: sec.items.map(item =>
          item.id === responseId ? { ...item, photo_path: null } : item
        )
      })));
      setPhotoModal(null);
    } catch (e) {
      setError('Ошибка удаления фото');
    }
  };

  const getSectionStats = (section) => {
    const ok = section.items.filter(i => i.status === 'ok').length;
    const issue = section.items.filter(i => i.status === 'issue').length;
    const total = section.items.length;
    const answered = ok + issue;
    return { ok, issue, total, answered, pct: answered > 0 ? Math.round((ok / answered) * 100) : null };
  };

  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // ===================== VIEWS =====================

  if (loading) return (
    <div className="flex-center" style={{ height: '300px' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // ---- Session view ----
  if (view === 'session' && currentSession) {
    const totalOk = sections.flatMap(s => s.items).filter(i => i.status === 'ok').length;
    const totalIssue = sections.flatMap(s => s.items).filter(i => i.status === 'issue').length;
    const totalAnswered = totalOk + totalIssue;
    const totalItems = sections.flatMap(s => s.items).length;
    const scorePct = currentSession.score_pct || 0;
    const progressColor = scorePct >= 80 ? '#22c55e' : scorePct >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ width: '100%' }}>
        {/* Header */}
        <div className="flex-between mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => { setView('list'); loadSessions(); }} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
              ← Назад
            </button>
            <div>
              <h1 style={{ margin: 0 }}>Чек-лист 5S</h1>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {currentSession.area} — {new Date(currentSession.created_at).toLocaleString('ru')}
                {currentSession.conducted_by_name && ` — ${currentSession.conducted_by_name}`}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: progressColor, lineHeight: 1 }}>{scorePct}%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{totalAnswered}/{totalItems} проверено</div>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3"><AlertCircle size={16} /><span>{error}</span></div>}

        {/* Overall progress */}
        <div className="card mb-4" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Общий прогресс</span>
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.8125rem', color: '#22c55e' }}>✓ Выполнено: {totalOk}</span>
              <span style={{ fontSize: '0.8125rem', color: '#ef4444' }}>✗ Нарушений: {totalIssue}</span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>— Не проверено: {totalItems - totalAnswered}</span>
            </div>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(totalAnswered / totalItems) * 100}%`, background: progressColor, borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Sections */}
        {sections.map(section => {
          const cfg = SECTION_COLORS[section.section] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: section.section };
          const stats = getSectionStats(section);
          const collapsed = collapsedSections[section.section];

          return (
            <div key={section.section} className="card mb-3" style={{ overflow: 'hidden' }}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.section)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', color: cfg.color }}>{section.section}</span>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>{cfg.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {stats.ok} выполнено · {stats.issue} нарушений · {stats.total - stats.answered} не проверено
                  </div>
                </div>
                {stats.pct !== null && <ScoreBadge pct={stats.pct} />}
                <div style={{ color: '#64748b', marginLeft: '8px' }}>
                  {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </button>

              {/* Progress bar for section */}
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: '100%', width: `${(stats.answered / stats.total) * 100}%`, background: cfg.color, transition: 'width 0.3s' }} />
              </div>

              {/* Items */}
              {!collapsed && (
                <div style={{ padding: '0.5rem 1.25rem 1.25rem' }}>
                  {section.items.map((item, idx) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      index={idx + 1}
                      sectionColor={cfg.color}
                      onStatusChange={(status) => updateResponse(item.id, status, item.comment)}
                      onCommentChange={(comment) => updateResponse(item.id, item.status, comment)}
                      onPhotoUpload={(file) => uploadPhoto(item.id, file)}
                      onPhotoClick={() => setPhotoModal({ id: item.id, path: item.photo_path })}
                      fileInputRef={el => fileInputRefs.current[item.id] = el}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Photo modal */}
        {photoModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setPhotoModal(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
              <img
                src={`${API_BASE}/${photoModal.path}`}
                alt="Фото"
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px', display: 'block' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => deletePhoto(photoModal.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={15} /> Удалить фото
                </button>
                <button className="btn btn-secondary" onClick={() => setPhotoModal(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- List view ----
  return (
    <div style={{ width: '100%' }}>
      <div className="flex-between mb-4">
        <h1 style={{ margin: 0 }}>Чек-листы 5S</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={newArea}
            onChange={e => setNewArea(e.target.value)}
            placeholder="Зона проверки"
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem', width: '200px' }}
          />
          <button className="btn btn-primary" onClick={createSession} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            {saving ? 'Создание...' : 'Новая проверка'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3"><AlertCircle size={16} /><span>{error}</span></div>}

      {/* Info card */}
      <div className="card mb-4" style={{ padding: '1.25rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {Object.entries(SECTION_COLORS).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.75rem', color: cfg.color }}>{key}</span>
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <ClipboardCheck size={48} color="#3b82f6" style={{ marginBottom: '12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Проверок пока нет</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Нажмите «Новая проверка» чтобы начать первую инспекцию 5S</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sessions.map(session => {
            const pct = session.score_pct || 0;
            const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div
                key={session.id}
                className="card"
                style={{ padding: '1rem 1.25rem', cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => loadSession(session.id)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `rgba(${color === '#22c55e' ? '34,197,94' : color === '#f59e0b' ? '245,158,11' : '239,68,68'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClipboardCheck size={22} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{session.area}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {new Date(session.created_at).toLocaleString('ru')}
                      {session.conducted_by_name && ` · ${session.conducted_by_name}`}
                    </div>
                    {/* Mini progress */}
                    {session.max_score > 0 && (
                      <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', width: '200px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>
                      {session.max_score > 0 ? `${pct}%` : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {session.score}/{session.max_score} пунктов
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---- Checklist Item Component ----
const ChecklistItem = ({ item, index, sectionColor, onStatusChange, onCommentChange, onPhotoUpload, onPhotoClick, fileInputRef }) => {
  const [comment, setComment] = useState(item.comment || '');
  const [editingComment, setEditingComment] = useState(false);
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.na;
  const StatusIcon = statusCfg.icon;

  const handleCommentBlur = () => {
    setEditingComment(false);
    if (comment !== (item.comment || '')) {
      onCommentChange(comment);
    }
  };

  return (
    <div style={{
      padding: '0.875rem',
      marginTop: '6px',
      borderRadius: '10px',
      background: item.status === 'ok' ? 'rgba(34,197,94,0.03)' : item.status === 'issue' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${item.status === 'ok' ? 'rgba(34,197,94,0.12)' : item.status === 'issue' ? 'rgba(239,68,68,0.12)' : 'rgba(15,23,42,0.04)'}`,
      transition: 'all 0.15s'
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {/* Number */}
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
          <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>{index}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '0.875rem', marginBottom: '4px' }}>{item.title}</div>
          {item.description && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>{item.description}</div>
          )}

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ok', 'issue', 'na'].map(status => {
              const cfg = STATUS_CONFIG[status];
              const SIcon = cfg.icon;
              const isActive = item.status === status;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: isActive ? 600 : 400,
                    background: isActive ? cfg.bg : 'rgba(255,255,255,0.04)',
                    color: isActive ? cfg.color : '#64748b',
                    transition: 'all 0.15s',
                    outline: isActive ? `1px solid ${cfg.color}30` : 'none'
                  }}
                >
                  <SIcon size={13} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Comment */}
          {(item.status === 'issue' || editingComment || comment) && (
            <div style={{ marginTop: '8px' }}>
              {editingComment ? (
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onBlur={handleCommentBlur}
                  autoFocus
                  placeholder="Описание нарушения или комментарий..."
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    color: '#0f172a', fontSize: '0.8125rem', resize: 'vertical', minHeight: '64px',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingComment(true)}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', cursor: 'text',
                    border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',
                    color: comment ? '#94a3b8' : '#475569', fontSize: '0.8125rem', minHeight: '34px'
                  }}
                >
                  {comment || <span style={{ fontStyle: 'italic' }}>+ добавить комментарий</span>}
                </div>
              )}
            </div>
          )}

          {!editingComment && !comment && item.status !== 'issue' && (
            <button
              onClick={() => setEditingComment(true)}
              style={{ marginTop: '6px', background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
            >
              + комментарий
            </button>
          )}
        </div>

        {/* Photo area */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          {item.photo_path ? (
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onPhotoClick}>
              <img
                src={`${API_BASE}/${item.photo_path}`}
                alt="Фото"
                style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(59,130,246,0.3)' }}
              />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '8px',
                background: 'rgba(0,0,0,0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.625rem', color: '#fff', opacity: 0, transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = 0; }}
              >
                🔍
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef?.click()}
              style={{
                width: '60px', height: '60px', borderRadius: '8px',
                border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                color: '#475569', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#475569'; }}
            >
              <Camera size={18} />
              <span style={{ fontSize: '0.5625rem' }}>Фото</span>
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) onPhotoUpload(e.target.files[0]); e.target.value = ''; }}
          />
          {/* Status icon */}
          <StatusIcon size={18} color={statusCfg.color} />
        </div>
      </div>
    </div>
  );
};

export default ChecklistPage;
