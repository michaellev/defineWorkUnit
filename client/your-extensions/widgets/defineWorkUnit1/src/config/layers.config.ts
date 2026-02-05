/**
 * layers.config.ts
 * הגדרות השכבות ושמות השדות
 */

export const LAYERS_CONFIG = {
  // שכבת היערות (read-only)
  forests: {
    title: 'יער בניהול קק"ל מתארח',
    fields: {
      forestNum: { name: "FOR_Num", display: "מספר יער" },
      forestName: { name: "FOR_Name", display: "שם יער" },
    },
  },

  // שכבת החלקות (read-only)
  compartments: {
    title: "חלקות יער",
    fields: {
      forestNum: { name: "FOR_NO", display: "מספר יער" },
      compartmentNum: { name: "HELKA", display: "מספר חלקת יער" },
    },
  },

  // שכבת העומדים (read-only)
  stands: {
    title: "עומדי יער מתעדכנים",
    fields: {
      forestNum: { name: "FOR_NO", display: "מספר יער" },
      forestName: { name: "ForestName", display: "שם יער" },
      compartmentNum: { name: "HELKA", display: "חלקה" },
      standNum: { name: "STAND_NO", display: "עומד" },
    },
  },

  // שכבת יחידות העבודה (writable)
  workUnits: {
    title: "יחידות עבודה טיפול יערני פוליגונלי בדיקות",
    fields: {
      forestNum: { name: "FOR_NO", display: "מספר יער" },
      forestName: { name: "FOR_Name", display: "שם יער" },
      compartments: { name: "HELKA", display: "מספר חלקה" },
      stands: { name: "Stands", display: "עומדים" },
      workUnitId: { name: "TRTUnit", display: "יחידת עבודה" },
      status: { name: "WPFSRequestStatus", display: "סטטוס הבקשה" }, // סטטוס
      lockTimestamp: { name: "LockTimestamp", display: "חתימת זמן נעילה" },
      date: { name: "Date", display: "תאריך" },  // תאריך
    },
    // סטטוסים המאפשרים עריכה
    editableStatuses: ["בהכנה", "הוגש למחלקת יער"],
  },
};

// קבועי מנגנון הנעילה
export const LOCK_CONSTANTS = {
  LOCK_TIMEOUT: 25000, // 25 שניות - זמן עד שנעילה נחשבת פגה
  HEARTBEAT_INTERVAL: 15000, // 15 שניות - תדירות רענון הנעילה
  POLLING_INTERVAL: 25000, // 25 שניות - תדירות בדיקה מחדש כשתפוס
  TIME_TOLERANCE: 10, // סף להשוואת זמנים
};
