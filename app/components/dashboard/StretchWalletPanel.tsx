import type { DashboardStretchItem, DashboardWallet } from "../../dashboard/types";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * The Stretch Wallet — a DAILY SWITCH (tk, 5 Sep 2026).
 *
 * Every item done today = the day's reward, and the server names the reward
 * (`rewardLabel`, "1h 15m PS5 today"). There is no balance, no bank, no cap and
 * no Spend button any more: nobody was tracking minutes, so the arithmetic the
 * old panel displayed was a fiction. Mon–Fri only; on a weekend `available` is
 * false and page.tsx does not draw this panel at all.
 *
 * RENDER-ONLY, AND STRICTLY SO. Whether the wallet is unlocked, which items are
 * done and whether the day is complete were all decided by /api/stretch against
 * the SERVER's Sydney clock. This component recomputes none of it.
 *
 * Purple is reserved for wallet value and reward actions (spec §10.5).
 */
type StretchWalletPanelProps = {
  /** null until /api/stretch answers. */
  wallet: DashboardWallet | null;
  items: DashboardStretchItem[];
  /** Server-supplied ids already done today. */
  earnedItemIds: Set<string>;
  /** The id currently being written. */
  savingId?: string | null;
  onEarn: (item: DashboardStretchItem) => void;
};

export default function StretchWalletPanel({
  wallet, items, earnedItemIds, savingId = null, onEarn,
}: StretchWalletPanelProps) {
  const locked = !wallet?.unlocked;
  const lockCopy = wallet && locked
    ? wallet.lockMessage ?? "Finish Morning Habits + Homeschool to unlock"
    : null;
  const done = wallet?.itemsDone ?? 0;
  const total = wallet?.itemsTotal ?? items.length;
  const complete = wallet?.complete === true;
  const reward = wallet?.rewardLabel ?? "1h 15m PS5 today";

  return (
    <Panel
      footer={
        <span className={styles.panelScore}>
          Today:{" "}
          <strong data-testid="wallet-status">
            {!wallet ? "—" : locked ? "locked" : complete ? `✅ ${reward}` : `${done}/${total} · all done = ${reward}`}
          </strong>
        </span>
      }
      title="Stretch Wallet"
      icon="🎮"
      subtitle={`Mon–Fri · all ${total || 4} done = ${reward}`}
      accent="var(--ansar-wallet)"
      className={styles.walletPanel}
      summary={
        <span data-testid="wallet-balance" className={styles.walletBalance}>
          {wallet && !locked ? `${done}/${total}` : "—"}
        </span>
      }
    >
      {lockCopy ? (
        <p className={styles.walletLock}>
          {/* Glyph in its own node so the element's text is exactly the
              server's sentence, not the server's sentence plus decoration. */}
          <span aria-hidden className={styles.walletLockGlyph}>🔒</span>
          {lockCopy}
        </p>
      ) : null}

      {wallet && !locked ? (
        <p className={complete ? styles.walletBonusOn : styles.walletBonus}>
          {complete ? `🏆 ${reward} — unlocked` : `🎯 ${done}/${total} done — finish them all for ${reward}`}
        </p>
      ) : null}

      <div className={styles.walletItems}>
        {items.length === 0 ? (
          <p className={styles.walletEmpty}>No stretch items available right now.</p>
        ) : null}

        {items.map(item => {
          const itemDone = earnedItemIds.has(item.id);
          const isSaving = savingId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={itemDone ? styles.walletItemDone : styles.walletItem}
              onClick={() => onEarn(item)}
              disabled={itemDone || isSaving || locked}
              aria-label={item.name}
              title={itemDone ? "Done today" : item.whatCountsAsDone || item.name}
            >
              <span className={styles.walletBox}>
                {isSaving ? <span className={styles.habitGlyph}>⏳</span>
                  : itemDone ? <span className={styles.walletTick}>✓</span>
                  : null}
              </span>
              <span className={styles.walletText}>
                <span className={styles.walletItemName}>{item.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
