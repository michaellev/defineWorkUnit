/**
 * config.ts
 * טיפוסי קונפיגורציה עבור הווידג'ט (לשימוש עתידי ב-Setting)
 */

import { type ImmutableObject } from 'jimu-core';

/**
 * אופן התנהגות בשינוי דרך כשיש רשימה זמנית
 * 'warnThenClear' - בפעם הראשונה מציג התראה, בפעמים הבאות מוחק אוטומטית
 * 'block' - לא מאפשר שינוי דרך כל עוד הרשימה לא ריקה
 */
export type WayChangeWithTempListBehavior = 'warnThenClear' | 'block';

/**
 * קונפיגורציית הווידג'ט
 */
export interface Config {
  /**
   * התנהגות בשינוי דרך כשיש רשימה זמנית לא ריקה
   * ברירת מחדל: 'block'
   */
  wayChangeWithTempListBehavior?: WayChangeWithTempListBehavior;
}

/**
 * ערכי ברירת מחדל
 */
export const defaultConfig: Config = {
  wayChangeWithTempListBehavior: 'block'
};

/**
 * טיפוס immutable של הקונפיגורציה (נדרש ע"י EXB)
 */
export type IMConfig = ImmutableObject<Config>;
