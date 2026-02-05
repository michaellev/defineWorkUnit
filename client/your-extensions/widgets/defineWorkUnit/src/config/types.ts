/**
 * types.ts
 * טיפוסים בסיסיים עבור הווידג'ט
 * widget types
 */

// === מצבי הווידג'ט ===
export type WidgetState =
  | "init"
  | "create"
  | "create.baseStands"
  | "create.baseStands.wayReshape"
  | "create.baseStands.wayClick"
  | "create.baseStands.wayRect"
  | "create.baseStands.wayPoly"
  | "create.baseStands.wayList"
  | "edit"
  | "edit.selected"
  | "edit.selected.baseStands"
  | "edit.selected.baseStands.wayReshape"
  | "edit.selected.baseStands.wayClick"
  | "edit.selected.baseStands.wayRect"
  | "edit.selected.baseStands.wayPoly"
  | "edit.selected.baseStands.wayList";

// === בסיס לבניית יחידת עבודה ===
export type BaseType = "stands" | "line" | "freeDraw" | "polygonFromLayer";

// === דרך בחירת עומדים ===
export type SelectionWay = "click" | "rect" | "poly" | "list";

// === Correction Line/Polygon Types ===

/**
 * Result type for applyCorrectionLine
 * it is a discriminated union.
 * TypeScript needs you to narrow the type using type guards
 *  before accessing properties
 */
export type CorrectionResult =
  | {
    success: true;
    newPolygon: __esri.Polygon;
    message: string;
    partialStandIds: Set<string>;
    standsListAffectedByReshapeLine: Stand[];
    addedSegmentPaths?: number[][][];
    removedSegmentPaths?: number[][][];
    addedPockets?: __esri.Polygon[];
    removedPockets?: __esri.Polygon[];
    operationType: 'add' | 'remove';
  }
  | {
    success: false;
    message: string;
  }
  | {
    needsConfirmation: true;
    drawnPolygon: __esri.Polygon;
    message: string;
  };

/**
 * User choice for ambiguous polygon correction
 */
export type CorrectionChoice = 'add' | 'remove';

/**
 * State for correction confirmation dialog
 */
export interface CorrectionDialogState {
  visible: boolean;
  drawnPolygon?: __esri.Polygon;
  message?: string;
}

/**
 * State for pending correction (waiting for user confirmation)
 */
export interface PendingCorrection {
  newPolygon: __esri.Polygon;
  partialStandIds: Set<string>;
  standsListAffectedByReshapeLine: Stand[];
  operationType: 'add' | 'remove';
}

// === יער ===
export interface Forest {
  forestNum: number; // מספר יער - FOR_Num
  forestName: string; // שם יער - FOR_Name
}

// === חלקה ===
export interface Compartment {
  forestNum: number; // מספר יער - FOR_NO
  compartmentNum: number; // מספר חלקה - HELKA
}

// === עומד ===
export interface Stand {
  forestNum: number; // מספר יער - FOR_NO
  forestName: string; // שם יער - ForestName
  compartmentNum: number; // מספר חלקה - HELKA
  standNum: number; // מספר עומד - STAND_NO
  objectId?: number; // OBJECTID מהשרת
  geometry?: any; // גיאומטריה (פוליגון)
  isPartial?: boolean; // true אם העומד נחתך ואינו שלם
  isRemoved?: boolean;
}

// === יחידת עבודה ===
export interface WorkUnit {
  objectId?: number; // OBJECTID מהשרת (קיים רק בעריכה)
  forestNum: string; // מספר יער - FOR_NO
  forestName: string; // שם יער - FOR_Name
  compartments: string; // מספרי חלקות מופרדים בפסיק - HELKA
  stands: string; // עומדים בפורמט "2-125, 2-121, ..." - Stands
  workUnitId: string; // מזהה יחידת עבודה - TRTUnit
  status: string; // סטטוס הבקשה - WPFSRequestStatus
  lockTimestamp: number; // חותמת זמן נעילה - LockTimestamp
  geometry?: any; // גיאומטריה (פוליגון מאוחד)
}

// === מצב הווידג'ט המלא ===
export interface WidgetData {
  currentState: WidgetState; // מצב נוכחי
  selectedForest: Forest | null; // היער הנבחר
  workUnitStands: Stand[]; // עומדי יחידת העבודה (הרשימה הראשית)
  standsToAdd: Stand[]; // רשימת עומדים לצירוף (זמנית)
  standsToRemove: Stand[]; // רשימת עומדים להסרה (זמנית)
  editingWorkUnit: WorkUnit | null; // יחידת העבודה הנערכת (במצב edit)
  initialPolygon: __esri.Polygon | null; // פוליגון התחלתי ב-ITM (לבדיקת שינוי)
  initialStands: Stand[]; // עומדים התחלתיים (לבדיקת שינוי)
  isLoading: boolean; // האם מתבצעת פעולה מול השרת
  loadingMessage: string; // הודעת הטעינה
  errorMessage: string | null; // הודעת שגיאה
  lastMessage: string | null; // הודעת משוב למשתמש
  lastMessageType: 'info' | 'warning' | null;
  lastAddedStandIds: string[];  // לצורך הדגשה
  isHelpOpen: boolean; // האם חלון העזרה פתוח
  isDrawing: boolean;
  isDrawingForRemoval: boolean;
  isDrawingCorrectionLine: boolean; // האם מציירים קו תיקון
  isDrawingCorrectionPolygon: boolean; // האם מציירים קו תיקון
  isLoadingStands: boolean; // האם שכבת העומדים נטענת
  lastDrawnStandIds: string[];
  wayChangeAlertShown: boolean;  // האם הוצגה הודעת מעבר דרך
  // wayList fields
  availableForests: Forest[];
  availableCompartments: Compartment[];
  availableStands: Stand[];
  selectedCompartment: Compartment | null;
  // Locking mechanism
  waitingStartTime: number;      // When did we start waiting?
  isWaiting: boolean;           // Are we waiting for lock release?
  lockedWorkUnitId: string;     // Which work unit are we trying to lock?
  // All stands in current forest (for filtering locally)
  allForestStands: Stand[];
  // Work unit selection (when multiple overlap)
  overlappingWorkUnits: WorkUnit[];
  selectedOverlappingIndex: number;
  showWorkUnitSelector: boolean;
  // correction confirmation dialog
  correctionDialog: CorrectionDialogState | null;
  // corrected polygon (from correction line tool)
  wuPolygonFinal: __esri.Polygon | null;
  // pending correction (waiting for user confirmation)
  pendingCorrection: PendingCorrection | null;
}

// === ערכים התחלתיים ===
export const initialWidgetData: WidgetData = {
  currentState: "init",
  selectedForest: null,
  workUnitStands: [],
  standsToAdd: [],
  standsToRemove: [],
  editingWorkUnit: null,
  initialPolygon: null,
  initialStands: [],
  isLoading: false,
  loadingMessage: "",
  errorMessage: null,
  lastMessage: null,
  lastMessageType: null,
  lastAddedStandIds: [],
  isHelpOpen: false,
  isDrawing: false,
  isDrawingForRemoval: false,
  isDrawingCorrectionLine: false,
  isDrawingCorrectionPolygon: false,
  isLoadingStands: false,
  lastDrawnStandIds: [],
  wayChangeAlertShown: false,
  // wayList fields
  availableForests: [],
  availableCompartments: [],
  availableStands: [],
  selectedCompartment: null,
  // Locking mechanism
  waitingStartTime: 0,
  isWaiting: false,
  lockedWorkUnitId: '',
  // All stands in current forest
  allForestStands: [],
  // Work unit selection (when multiple overlap)
  overlappingWorkUnits: [],
  selectedOverlappingIndex: -1,
  showWorkUnitSelector: false,
  // correction confirmation dialog
  correctionDialog: null,
  // corrected polygon (from correction line tool)
  wuPolygonFinal: null,
  pendingCorrection: null,
};
