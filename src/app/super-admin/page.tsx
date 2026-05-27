'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateActivationCodes, subscribeActivationCodes, ActivationCode } from '@/lib/gameService';
import styles from './page.module.css';

export default function SuperAdminPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<string, ActivationCode> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');

  useEffect(() => {
    const ok = localStorage.getItem('bingo_super');
    if (ok !== 'true') { router.push('/'); return; }
    return subscribeActivationCodes(setCodes);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('bingo_super');
    router.push('/');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await generateActivationCodes();
    setGenerating(false);
  };

  const handleCopyUrl = (code: string) => {
    const url = `${window.location.origin}/game/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code + '_url');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code + '_code');
    setTimeout(() => setCopied(null), 2000);
  };

  const codeList = codes ? Object.values(codes) : [];
  const filtered = codeList.filter(c =>
    filter === 'all' ? true : filter === 'used' ? c.used : !c.used
  );
  const usedCount   = codeList.filter(c => c.used).length;
  const unusedCount = codeList.filter(c => !c.used).length;

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
          <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '생성 중...' : '⚡ 코드 100개 생성'}
          </button>
        </div>

        {!codes ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⬡</div>
            <p>아직 생성된 코드가 없습니다.</p>
            <p>"코드 100개 생성" 버튼을 눌러 시작하세요.</p>
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
                    {copied === c.code + '_url' ? '✓' : 'URL복사'}
                  </button>
                  <button className={styles.actionBtnPrimary} onClick={() => router.push(`/admin/${c.code}`)}>
                    관리
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
