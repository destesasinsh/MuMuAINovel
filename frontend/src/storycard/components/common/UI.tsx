import React, { type CSSProperties, type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { CARD_META, type Card } from '../../types';
import { useUIStore } from '../../store/uiStore';

function PortalShell({ children }: { children: ReactNode }) {
  return <div className="storycard-root storycard-portal">{children}</div>;
}

export function Stars({ value, className }: { value: number; className?: string }) {
  const n = Math.max(1, Math.min(5, Math.round(value * 5)));
  return (
    <span className={clsx('stars', className)} aria-label={`重要度 ${n}/5`}>
      {'★'.repeat(n)}
      {'☆'.repeat(5 - n)}
    </span>
  );
}

export function TypeGlyph({ type }: { type: Card['type'] }) {
  const meta = CARD_META[type];
  return (
    <span
      className="tp-glyph"
      style={{ background: `linear-gradient(150deg, ${meta.color}, ${meta.color}bb)` }}
    >
      {meta.glyph}
    </span>
  );
}

export function StatusDot({ color }: { color: string }) {
  return <span className="status-dot" style={{ background: color, color }} />;
}

/** 卡牌外壳：羊皮纸 + 类型绶带 */
export function CardShell({
  card,
  children,
  onClick,
  selected,
  pulse,
  className,
  style,
}: {
  card: Card;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const meta = CARD_META[card.type];
  return (
    <div
      className={clsx('node-shell', selected && 'selected', pulse && 'pulse', className)}
      onClick={onClick}
    >
      <div
        className="card-frame"
        style={{ ['--type-color' as string]: meta.color, ...style } as CSSProperties}
      >
        <div className="card-ribbon">
          <span>{meta.glyph}</span>
        </div>
        <div className="card-type-label">{meta.label}</div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 620,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return createPortal(
    <PortalShell>
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            style={{ width }}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div style={{ minWidth: 0 }}>
                <h2 className="modal-title">{title}</h2>
                {subtitle && <div className="modal-sub">{subtitle}</div>}
              </div>
              <button className="modal-close" onClick={onClose} aria-label="关闭">
                ✕
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </PortalShell>,
    document.body,
  );
}

/* ---------------- Toast ---------------- */

export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  return createPortal(
    <PortalShell>
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} text={t.text} tone={t.tone} onDone={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
    </PortalShell>,
    document.body,
  );
}

function ToastItem({
  text,
  tone,
  onDone,
}: {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warn';
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      className={clsx('toast', tone)}
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 18, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onDone}
    >
      <span className="toast-dot" />
      <span>{text}</span>
    </motion.div>
  );
}

/* ---------------- 其他 ---------------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>{title}</div>
      {hint && <div>{hint}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}
