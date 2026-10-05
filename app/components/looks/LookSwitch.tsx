"use client";
import { LOOKS, LOOK_NAMES, setLook, useLook, type Look } from "./looks";
import styles from "./looks.module.css";

/** Chooses one of the three looks for this device. A native select: three
 *  options, one choice, works with a keyboard and a thumb without any help. */
export default function LookSwitch() {
  const look = useLook();
  return (
    <label className={styles.look}>
      <span className={styles.lookLabel}>Look</span>
      <select
        id="ansar-look"
        className={styles.lookSelect}
        value={look}
        onChange={e => setLook(e.target.value as Look)}
      >
        {LOOKS.map(l => <option key={l} value={l}>{LOOK_NAMES[l]}</option>)}
      </select>
    </label>
  );
}
