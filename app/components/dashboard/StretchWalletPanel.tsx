import type { DashboardStretchItem, DashboardWallet } from "../../dashboard/types";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * The Stretch Wallet.
 *
 * RENDER-ONLY, AND STRICTLY SO. Every number and every state here was decided
 * by /api/stretch against the SERVER's Sydney clock: whether the wallet is
 * unlocked, whether redemption is open, the daily cap, the weekend bonus, and
 * which items are already banked. This component recomputes none of it. A
 * second opinion about what a reward costs is how a child ends up being told
 * two different things by two surfaces reading the same rows.
 *
 * That is why `unlocked` and `redemptionOpen` are read as booleans rather than
 * re-derived from the weekday: a local rule that agrees with the server today
 * is still a local rule, and it will disagree the first time the server's rule
 * changes.
 *
 * Purple is reserved for wallet value and reward actions (spec §10.5).
 */
type StretchWalletPanelProps = {
  /** null until /api/stretch answers. */
  wallet: DashboardWallet | null;
  items: DashboardStretchItem[];
  /** Server-supplied ids already banked today. */
  earnedItemIds: Set<string>;
  /** The id currently being written, or "__spend__" for a conversion. */
  savingId?: string | null;
  /** Pre-load fallback for the rate; wallet.minPerPoint wins once loaded. */
  minPerPoint: number;
  /** Constant — /api/stretch does not report a conversion step. */
  spendStepMin: number;
  /** Pre-load fallback for the cap; wallet.dailyRedeemCapMin wins once loaded. */
  dailyCapMin: number;
  onEarn: (item: DashboardStretchItem) => void;
  onSpend: () => void;
};

const SPEND_ID = "__spend__";

export default function StretchWalletPanel({
  wallet, items, earnedItemIds, savingId = null,
  minPerPoint, spendStepMin, dailyCapMin, onEarn, onSpend,
}: StretchWalletPanelProps) {
  const locked = !wallet?.unlocked;
  /**
   * The rate and the cap come from /api/stretch when it has answered. The
   * props are a PRE-LOAD FALLBACK, not a second opinion: if the server retunes
   * minPerPoint, an item priced from the local constant would advertise
   * minutes the server will not pay.
   */
  const rate = wallet?.minPerPoint ?? minPerPoint;
  const capMin = wallet?.dailyRedeemCapMin ?? dailyCapMin;

  /**
   * The two sentences the server can send about availability.
   *
   * /api/stretch sets redemptionMessage to the SAME string as lockMessage while
   * the wallet is locked, so rendering both printed the lock reason twice —
   * once in the banner and once under it. The second copy is suppressed when it
   * says nothing new. It is not dropped outright: when redemption is closed for
   * a different reason than the lock, that sentence is the only place the
   * reason appears.
   */
  const lockCopy = wallet && locked
    ? wallet.lockMessage ?? "Finish Morning Habits + Homeschool to unlock"
    : null;
  const redemptionCopy = wallet && wallet.redemptionMessage !== lockCopy
    ? wallet.redemptionMessage
    : null;
  // NOTE: the convert button deliberately does NOT re-derive "is it the
  // weekend" to relabel itself. redemptionOpen is the server's answer; the
  // label stays constant, `disabled` carries the state, and the server's own
  // redemptionMessage explains when conversion opens.

  const bonusTotal = wallet?.weekendBonusItemsTotal ?? 0;
  const bonusMin = wallet?.weekendBonusMin ?? 30;

  return (
    <Panel
      title="Stretch Wallet"
      subtitle={`Banks all week · converts Sat & Sun · ${capMin} min/day cap`}
      accent="var(--ansar-wallet)"
      className={styles.walletPanel}
      summary={
        <>
          <span data-testid="wallet-balance" className={styles.walletBalance}>
            {wallet && !locked ? `${wallet.balance} min` : "—"}
          </span>
          <span className={styles.panelPoints}>
            {wallet && !locked ? `${wallet.earnedWeek} earned · ${wallet.spentWeek} spent` : "locked"}
          </span>
        </>
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

      {redemptionCopy ? (
        <p className={styles.walletNote}>{redemptionCopy}</p>
      ) : null}

      {/* Weekend all-items bonus. Weekend only — the server sends itemsTotal 0
          on a weekday — and above the list so the deal is visible before the
          first tap. This line renders what /api/stretch decided. */}
      {wallet && !locked && bonusTotal > 0 ? (
        <p className={wallet.weekendBonusActive ? styles.walletBonusOn : styles.walletBonus}>
          {wallet.weekendBonusActive
            ? `🏆 Weekend bonus ON — all ${bonusTotal} done, +${bonusMin} min PS5 today`
            : `🎯 Weekend bonus: ${wallet.weekendBonusItemsDone ?? 0}/${bonusTotal} — do them all for +${bonusMin} min PS5 today`}
        </p>
      ) : null}

      <div className={styles.walletItems}>
        {items.length === 0 ? (
          <p className={styles.walletEmpty}>No stretch items available right now.</p>
        ) : null}

        {items.map(item => {
          const done = earnedItemIds.has(item.id);
          const isSaving = savingId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={done ? styles.walletItemDone : styles.walletItem}
              onClick={() => onEarn(item)}
              disabled={done || isSaving || locked}
              aria-label={item.name}
            >
              <span className={styles.walletBox}>
                {isSaving ? <span className={styles.habitGlyph}>⏳</span>
                  : done ? <span className={styles.walletTick}>✓</span>
                  : null}
              </span>
              <span className={styles.habitText}>
                <span className={styles.walletItemName}>🧩 {item.name}</span>
                <span className={styles.walletItemNote}>
                  {done ? "✓ banked today" : item.whatCountsAsDone || `Worth ${item.points} pt`}
                </span>
              </span>
              <span className={styles.walletItemValue}>+{item.points * rate}m</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={wallet?.redemptionOpen ? styles.walletSpendOpen : styles.walletSpend}
        onClick={onSpend}
        disabled={!wallet?.redemptionOpen || savingId === SPEND_ID}
      >
        {`Convert ${spendStepMin} min →`}
      </button>
    </Panel>
  );
}
