/**
 * mock-data.ts
 * נתוני דמה לבדיקת הווידג'ט לפני חיבור לשרת
 */

import { Forest, Compartment, Stand, WorkUnit } from './types';

// === יערות לדוגמה ===
export const MOCK_FORESTS: Forest[] = [
  { forestNum: 3416, forestName: "אשתאול" },
  { forestNum: 3417, forestName: "הזורע" },
  { forestNum: 3418, forestName: "בן שמן" }
];

// === חלקות לדוגמה ===
export const MOCK_COMPARTMENTS: Compartment[] = [
  // יער אשתאול
  { forestNum: 3416, compartmentNum: 2 },
  { forestNum: 3416, compartmentNum: 3 },
  { forestNum: 3416, compartmentNum: 4 },
  { forestNum: 3416, compartmentNum: 6 },
  { forestNum: 3416, compartmentNum: 8 },
  { forestNum: 3416, compartmentNum: 9 },
  // יער הזורע
  { forestNum: 3417, compartmentNum: 1 },
  { forestNum: 3417, compartmentNum: 2 },
  { forestNum: 3417, compartmentNum: 3 }
];

// === עומדים לדוגמה ===
export const MOCK_STANDS: Stand[] = [
  // יער אשתאול, חלקה 8
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 8, standNum: 100, objectId: 1001 },
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 8, standNum: 110, objectId: 1002 },
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 8, standNum: 120, objectId: 1003 },
  // יער אשתאול, חלקה 9
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 9, standNum: 200, objectId: 1004 },
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 9, standNum: 210, objectId: 1005 },
  // יער אשתאול, חלקה 12
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 12, standNum: 100, objectId: 1006 },
  // יער אשתאול, חלקה 13
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 13, standNum: 200, objectId: 1007 },
  { forestNum: 3416, forestName: "אשתאול", compartmentNum: 13, standNum: 300, objectId: 1008 },
  // יער הזורע, חלקה 1
  { forestNum: 3417, forestName: "הזורע", compartmentNum: 1, standNum: 100, objectId: 2001 },
  { forestNum: 3417, forestName: "הזורע", compartmentNum: 1, standNum: 110, objectId: 2002 },
  // יער הזורע, חלקה 2
  { forestNum: 3417, forestName: "הזורע", compartmentNum: 2, standNum: 200, objectId: 2003 },
  { forestNum: 3417, forestName: "הזורע", compartmentNum: 2, standNum: 210, objectId: 2004 }
];

// === יחידות עבודה לדוגמה ===
export const MOCK_WORK_UNITS: WorkUnit[] = [
  {
    objectId: 5001,
    forestNum: "3416",
    forestName: "אשתאול",
    compartments: "8,9,12",
    stands: "8-100, 8-110, 9-200, 12-100",
    workUnitId: "T341638",
    status: "בהכנה",
    lockTimestamp: 0
  },
  {
    objectId: 5002,
    forestNum: "3416",
    forestName: "אשתאול",
    compartments: "13",
    stands: "13-200, 13-300",
    workUnitId: "T341639",
    status: "הוגש למחלקת יער",
    lockTimestamp: 0
  },
  {
    objectId: 5003,
    forestNum: "3417",
    forestName: "הזורע",
    compartments: "1,2",
    stands: "1-100, 1-110, 2-200",
    workUnitId: "T341701",
    status: "בביצוע",
    lockTimestamp: 0
  }
];

// === פונקציות עזר לעבודה עם נתוני הדמה ===

/**
 * מחזיר את כל היערות
 */
export function getMockForests(): Forest[] {
  console.log('[MOCK] getMockForests()');
  return MOCK_FORESTS;
}

/**
 * מחזיר חלקות לפי מספר יער
 */
export function getMockCompartmentsByForest(forestNum: number): Compartment[] {
  console.log(`[MOCK] getMockCompartmentsByForest(${forestNum})`);
  return MOCK_COMPARTMENTS.filter(c => c.forestNum === forestNum);
}

/**
 * מחזיר עומדים לפי מספר יער
 */
export function getMockStandsByForest(forestNum: number): Stand[] {
  console.log(`[MOCK] getMockStandsByForest(${forestNum})`);
  return MOCK_STANDS.filter(s => s.forestNum === forestNum);
}

/**
 * מחזיר עומדים לפי מספר יער ומספר חלקה
 */
export function getMockStandsByCompartment(forestNum: number, compartmentNum: number): Stand[] {
  console.log(`[MOCK] getMockStandsByCompartment(${forestNum}, ${compartmentNum})`);
  return MOCK_STANDS.filter(s => s.forestNum === forestNum && s.compartmentNum === compartmentNum);
}

/**
 * מחזיר עומד לפי objectId
 */
export function getMockStandByObjectId(objectId: number): Stand | undefined {
  console.log(`[MOCK] getMockStandByObjectId(${objectId})`);
  return MOCK_STANDS.find(s => s.objectId === objectId);
}

/**
 * מחזיר יחידות עבודה לפי מספר יער
 */
export function getMockWorkUnitsByForest(forestNum: number): WorkUnit[] {
  console.log(`[MOCK] getMockWorkUnitsByForest(${forestNum})`);
  return MOCK_WORK_UNITS.filter(wu => wu.forestNum === String(forestNum));
}

/**
 * מחזיר יחידת עבודה לפי objectId
 */
export function getMockWorkUnitByObjectId(objectId: number): WorkUnit | undefined {
  console.log(`[MOCK] getMockWorkUnitByObjectId(${objectId})`);
  return MOCK_WORK_UNITS.find(wu => wu.objectId === objectId);
}
