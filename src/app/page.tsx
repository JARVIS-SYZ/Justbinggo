'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCode } from '@/lib/gameService';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [shake, setShake]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    // 이미 로그인된 코드인지 먼저 확인 (재접속 허용)
    const upperCode = code.trim().toUpperCase();
    const alreadyLoggedIn = localStorage.getItem(`bingo_admin_${upperCode}`);

    if (alreadyLoggedIn === 'true') {
      router.push(`/admin/${upperCode}`);
      setLoading(false);
      return;
    }

    const type = await validateCode(upperCode);

    if (type === 'super') {
      localStorage.setItem('bingo_super', 'true');
      router.push('/super-admin');
    } else if (type === 'event') {
      localStorage.setItem(`bingo_admin_${upperCode}`, 'true');
      router.push(`/admin/${upperCode}`);
    } else if ((type as string) === 'already_used') {
      setError('이미 사용 중인 코드입니다.');
      setShake(true);
      setCode('');
      setTimeout(() => setShake(false), 500);
    } else {
      setError('올바르지 않은 코드입니다.');
      setShake(true);
      setCode('');
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.scanLine} />
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.loginBox}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>⬡</div>
          <h1 className={styles.title}>BINGO</h1>
          <p className={styles.subtitle}>SYSTEM v1.0</p>
        </div>

        <div className={styles.divider}><span>코드 입력</span></div>

        <form onSubmit={handleSubmit} className={`${styles.form} ${shake ? styles.shake : ''}`}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>ACCESS CODE</label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="XXXXXX"
              className={styles.input}
              maxLength={20}
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <span>{loading ? '확인 중...' : '접속하기'}</span>
            {!loading && <span className={styles.arrow}>→</span>}
          </button>
        </form>

        <p className={styles.hint}>관객은 QR코드 또는 관리자가 제공한 URL로 접속하세요</p>
      </div>
    </div>
  );
}
