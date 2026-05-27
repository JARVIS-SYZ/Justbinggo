'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || '1234';

export default function HomePage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // 이미 인증된 경우 관리자 페이지로
    const isAdmin = sessionStorage.getItem('bingo_admin');
    if (isAdmin === 'true') {
      router.push('/admin');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem('bingo_admin', 'true');
      router.push('/admin');
    } else {
      setError('보안 번호가 올바르지 않습니다.');
      setShake(true);
      setPasscode('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className={styles.container}>
      {/* Decorative elements */}
      <div className={styles.scanLine} />
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.loginBox}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>⬡</div>
          <h1 className={styles.title}>BINGO</h1>
          <p className={styles.subtitle}>SYSTEM v1.0</p>
        </div>

        <div className={styles.divider}>
          <span>관리자 인증</span>
        </div>

        <form onSubmit={handleSubmit} className={`${styles.form} ${shake ? styles.shake : ''}`}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>PASSCODE</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setError(''); }}
              placeholder="••••"
              className={styles.input}
              maxLength={20}
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            <span>접속하기</span>
            <span className={styles.arrow}>→</span>
          </button>
        </form>

        <p className={styles.hint}>관객 참가는 QR코드 또는 관리자가 제공한 URL로 접속하세요</p>
      </div>
    </div>
  );
}
