'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  addActivationCodes, deleteActivationCode, deleteAllActivationCodes,
  resetActivationCode, resetAllActivationCodes,
  subscribeActivationCodes, ActivationCode,
} from '@/lib/gameService';
import styles from './page.module.css';

export default function SuperAdminPage() {
  const router = useRouter();
  const [codes, setCodes]           = useState<Record<string, ActivationCode> | null>(null);
  const [filter, setFilter]         = useState<'all' | 'used' | 'unused'>('all');
  const [copied, setCopied]         = useState<string | null>(null);

  // 코드 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputText, setInputText]       = useState('');
  const [adding, setAdding]             = useState(false);
  const [addResult, setAddResult]       = useState<{ added: number; skipped: number; skippedCodes: string[] } | null>(null);

  useEffect(() => {
    const ok = localStorage.getItem('bingo_super');
    if (ok !== 'true') { router.push('/'); return; }
    return subscribeActivationCodes(setCodes);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('bingo_super');
    router.push('/');
  };

  const handleAdd = async () => {
    if (!inputText.trim()) return;
    setAdding(true);
    const result = await addActivationCodes(inputText);
    setAddResult(result);
    setInputText('');
    setAdding(false);
  };

  const handleResetOne = async (code: string) => {
    if (!confirm(`"${code}" 코드를 미사용으로 리셋할까요?`)) return;
    await resetActivationCode(code);
  };

  const handleResetAll = async () => {
    if (!confirm('사용된 코드를 모두 미사용으로 리셋할까요?')) return;
    await resetAllActivationCodes();
  };

  const handleDeleteOne = async (code: string) => {
    if (!confirm(`"${code}" 코드를 삭제할까요?`)) return;
    await deleteActivationCode(code);
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 코드를 삭제할까요? 되돌릴 수 없습니다.')) return;
    await deleteAllActivationCodes();
  };

  const handleCopyUrl = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/admin/${code}`);
    setCopied(code + '_url');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code + '_code');
    setTimeout(() => setCopied(null), 2000);
  };

  const codeList   = codes ? Object.values(codes) : [];
  const filtered   = codeList.filter(c =>
    filter === 'all' ? true : filter === 'used' ? c.used : !c.used
  );
  const usedCount   = codeList.filter(c => c.used).length;
  const unusedCount = codeList.filter(c => !c.used).length;

  // 입력창 미리보기 - 줄 수 카운트
  const previewLines = inputText.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>⬡ BINGO</div>
          <span className={styles.superBadge}>SUPER ADMIN</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.stat}><span>전체</span><strong>{codeList.length}</strong></div>
          <div className={styles.stat}><span>사용됨</span><strong className={styles.statUsed}>{usedCount}</strong></div>
          <div className={styles.stat}><span>미사용</span><strong className={styles.statUnused}>{unusedCount}</strong></div>
          <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {(['all','unused','used'] as const).map(f => (
              <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? `전체 (${codeList.length})` : f === 'used' ? `사용됨 (${usedCount})` : `미사용 (${unusedCount})`}
              </button>
            ))}
          </div>
          <div className={styles.toolbarRight}>
            <button className={styles.addBtn} onClick={() => { setShowAddModal(true); setAddResult(null); }}>
              + 코드 추가
            </button>
            {usedCount > 0 && (
              <button className={styles.resetAllBtn} onClick={handleResetAll}>
                ↺ 전체 리셋
              </button>
            )}
            {codeList.length > 0 && (
              <button className={styles.deleteAllBtn} onClick={handleDeleteAll}>
                전체 삭제
              </button>
            )}
          </div>
        </div>

        {!codes || codeList.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⬡</div>
            <p>아직 생성된 코드가 없습니다.</p>
            <p>"+ 코드 추가" 버튼을 눌러 시작하세요.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(c => (
              <div key={c.code} className={`${styles.codeCard} ${c.used ? styles.codeUsed : ''}`}>
                <div className={styles.codeTop}>
                  <span className={styles.codeText}>{c.code}</span>
                  <span className={`${styles.codeBadge} ${c.used ? styles.badgeUsed : styles.badgeUnused}`}>
                    {c.used ? '사용됨' : '미사용'}
                  </span>
                </div>
                <div className={styles.codeActions}>
                  <button className={styles.actionBtn} onClick={() => handleCopyCode(c.code)}>
                    {copied === c.code + '_code' ? '✓' : '코드복사'}
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleCopyUrl(c.code)}>
                    {copied === c.code + '_url' ? '✓' : '관리자URL'}
                  </button>
                  <button className={styles.actionBtnPrimary} onClick={() => router.push(`/admin/${c.code}`)}>
                    관리
                  </button>
                  {c.used && (
                    <button className={styles.actionBtnReset} onClick={() => handleResetOne(c.code)}>
                      리셋
                    </button>
                  )}
                  <button className={styles.actionBtnDelete} onClick={() => handleDeleteOne(c.code)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 코드 추가 모달 */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>코드 추가</h2>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <p className={styles.modalDesc}>
              코드를 한 줄에 하나씩 입력하세요.<br/>
              기존 코드와 중복된 항목은 자동으로 제외됩니다.
            </p>

            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={'CODE001\nCODE002\nCODE003\n...'}
                rows={12}
                autoFocus
              />
              <div className={styles.textareaFooter}>
                {previewLines.length > 0 && (
                  <span className={styles.lineCount}>{previewLines.length}개 입력됨</span>
                )}
              </div>
            </div>

            {/* 결과 메시지 */}
            {addResult && (
              <div className={styles.addResult}>
                <span className={styles.addResultSuccess}>✓ {addResult.added}개 추가됨</span>
                {addResult.skipped > 0 && (
                  <span className={styles.addResultSkip}>
                    {addResult.skipped}개 중복 제외
                    {addResult.skippedCodes.length <= 5 && (
                      <span className={styles.skippedList}> ({addResult.skippedCodes.join(', ')})</span>
                    )}
                  </span>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowAddModal(false)}>닫기</button>
              <button
                className={styles.modalAddBtn}
                onClick={handleAdd}
                disabled={adding || previewLines.length === 0}
              >
                {adding ? '추가 중...' : `${previewLines.length}개 추가하기`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
