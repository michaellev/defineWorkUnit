System.register([], function (e) {
  return {
    execute: function () {
      e({
        // Widget title
        _widgetLabel: `הגדרת יחידת עבודה`,

        // State display names
        stateInit: `התחלה`,
        stateCreate: `יצירה`,
        stateCreateBaseStands: `יצירה - עומדים`,
        stateCreateWayReshape: `יצירה - תיקון חופשי`,
        stateCreateWayClick: `יצירה - הקלקה`,
        stateCreateWayRect: `יצירה - מלבן`,
        stateCreateWayPoly: `יצירה - פוליגון`,
        stateCreateWayList: `יצירה - רשימה`,
        stateEdit: `עריכה`,
        stateEditSelected: `עריכה - נבחר`,
        stateEditSelectedBaseStands: `עריכה - עומדים`,
        stateEditSelectedWayReshape: `עריכה - תיקון חופשי`,
        stateEditSelectedWayClick: `עריכה - הקלקה`,
        stateEditSelectedWayRect: `עריכה - מלבן`,
        stateEditSelectedWayPoly: `עריכה - פוליגון`,
        stateEditSelectedWayList: `עריכה - רשימה`,

        // Main buttons
        createNewWorkUnit: `יצירה`,
        editExistingWorkUnit: `עריכה`,
        help: `עזרה`,
        cancelAll: `בטל הכל`,
        finishAndSave: `סיים ושמור י"ע`,

        // "Geometry Source" dropdown
        selectBase: `שיטת בניה/עדכון`,
        baseStands: `בחירת עומדים`,
        baseFreeDraw: `ציור חופשי`,
        baseLine: `קו עם באפר`,
        basePolygonFromLayer: `פוליגון משכבה אחרת`,

        // "Selection Method" dropdown
        selectWay: `שיטת בחירה`,
        wayReshape: `גרפית: תיקון חופשי ע"י קו או פוליגון`,
        wayClick: `גרפית: עומדים שלמים ע"י הקלקה`,
        wayRect: `גרפית: עומדים שלמים ע"י ציור מלבן`,
        wayPoly: `גרפית: עומדים שלמים ע"י ציור פוליגון`,
        wayList: `עומדים שלמים ע"י רשימה`,

        // Forest/Compartment/Stands dropdowns
        selectForest: `בחר יער`,
        selectCompartment: `בחר חלקה`,
        selectStands: `בחר עומדים`,

        // Action buttons
        drawRectAdd: `צייר מלבן להוספה`,
        drawRectRemove: `צייר מלבן להסרה`,
        drawPolyAdd: `צייר פוליגון להוספה`,
        drawPolyRemove: `צייר פוליגון להסרה`,

        addStands: `אשר צירוף`,
        clearStandsToAdd: `בטל צירוף`,
        confirmRemoval: `אשר הסרה`,
        cancelRemoval: `בטל הסרה`,

        doEachLineWrap: `קפל`,
        doEachLineUnWrap: `אל תקפל`,

        // Delete
        deleteWorkUnit: `מחק י"ע`,
        confirmDeleteWorkUnit: `האם אתה בטוח שברצונך למחוק את יחידת העבודה?`,
        deletingWorkUnit: `מוחק י"ע...`,
        deleteSuccess: `יחידת העבודה נמחקה בהצלחה`,
        deleteFailed: `מחיקת יחידת העבודה נכשלה`,

        // Correction line - add/update this section
        drawCorrectionPolyline: `קו`,
        drawCorrectionPolygon: `פוליגון`,
        correctionLineNoPolygon: `אין פוליגון לתיקון`,
        correctionLineNoIntersection: `הקו אינו חותך את הפוליגון`,
        correctionPolygonAdded: `הפוליגון נוסף ליחידת העבודה`,
        correctionHoleCreated: `נוצר חור ביחידת העבודה`,
        correctionAreaAdded: `השטח נוסף ליחידת העבודה`,
        correctionAreaRemoved: `השטח הוסר מיחידת העבודה`,
        correctionBoundaryUpdated: `גבול יחידת העבודה עודכן`,
        correctionError: `שגיאה בעדכון הפוליגון`,
        correctionNoChanges: `לא בוצעו שינויים - ודא שהקו חוצה את גבול הפוליגון`,
        cancelDrawing: `בטל`,
        confirmCorrection: `אשר תיקון`,
        cancelCorrection: `בטל תיקון`,
        correctionLineApplied: `התיקון בוצע`,
        correctionCancelled: `התיקון בוטל`,

        // Correction dialog
        correctionDialogTitle: `הפוליגון חוצה גבול`,
        correctionDialogMessage: `הפוליגון חוצה את גבול יחידת העבודה. מה ברצונך לעשות?`,
        correctionDialogAdd: `הוסף`,
        correctionDialogRemove: `הסר`,
        correctionDialogCancel: `בטל`,

        // Field labels
        forest: `יער`,
        workUnitId: `י"ע`, //for what is this used??
        workUnitStandsPrefix: `עומדי יחידת עבודה`,
        workUnitStandsSuffix: `(רשימה סופית)`,
        standsToAdd: `רשימת טיוטה לצירוף`,
        standsToRemove: `רשימת טיוטה להסרה`,
        standsToAddOrRemove: `רשימת טיוטה לצירוף/הסרה`,
        addedStands: `עומדי י"ע שצורפו`,
        alreadyInWorkUnit: `כבר בי"ע`,
        inOriginalWorkUnit: `בי\"ע המקורית`,
        toAdd: `הוסף`,
        message: `הודעה`,

        // Messages
        clickOnWorkUnitToEdit: `הקלק על יחידת העבודה`,
        loadingFromServer: `קורא מהשרת...`,
        savingToServer: `שומר לשרת...`,
        saveSuccess: `יחידת העבודה נשמרה בהצלחה`,
        saveFailed: `שמירת יחידת העבודה נכשלה`,
        workUnitNotEditable: `יחידת עבודה זו אינה ניתנת לעריכה`,
        standNotInForest: `העומד אינו ביער הנבחר`,
        noStandsSelected: `לא נבחרו עומדים`,
        workUnitLocked: `יחידת העבודה נעולה על ידי משתמש אחר. בודק שוב בעוד 25 שניות...`,
        lockAcquired: `הנעילה התקבלה, ניתן לערוך`,
        cancelWaiting: `בטל`,
        emptyList: `(ריק)`,

        //Alert Messages
        wayChangeBlocked: `לא ניתן לשנות שיטת בחירה, כל עוד קיימות רשימות טיוטה`,
        wayChangeWarning: `התראה: יש לרוקן רשימות הטיוטה טרם שינוי שיטת בחירה. בפעמים הבאות הן תימחקנה אוטומטית`,

        // Work unit selector dialog
        selectWorkUnit: `בחירת יחידת עבודה`,
        selectWorkUnitPrompt: `נמצאו מספר יחידות עבודה. בחר אחת:`,
        stands: `עומדים`,
        select: `בחר`,
        cancel: `בטל`,

        // Help - state.init
        helpInit:
          `מצב התחלה. שום דבר אינו מוגדר עדיין.\n` +
          `בחר תהליך - יצירה, או עריכה (שינוי)`,

        // Help - state.create
        helpCreate:
          `בחרת ליצור יחידת עבודה חדשה.\n` +
          `שום דבר אינו מוגדר בה עדיין.\n` +
          `תחילה, עליך לבחור\n` +
          `את מקור הגיאומאריה לפיו תבנה\n` +
          `את הפוליגון של יחידת העבודה.\n` +
          `בשלב ראשון -\n` +
          `רק בנייה לפי גיאומטריית עומדים תהא פעילה.`,

        // Help - state.create.baseStands
        helpCreateBaseStands:
          `בחרת ביצירה, כשמקור הגיאומטריה הוא עומדים.\n` +
          `עליך לבחור שיטה לצירוף\\הסרת עומדים -\n` +
          `ע"י רשימה, או ע"י אחת משלוש שיטות גרפיות.\n` +
          `ניתן להתחיל בשיטה אחת ולהמשיך בשיטה אחרת.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.`,

        // Help - state.create.baseStands.wayClick
        helpCreateWayClick:
          `הקלק על עומדים באותו יער, כדי לצרפם/להסירם.\n` +
          `בכל עת תוכל לעבור לשיטה אחרת.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.create.baseStands.wayRect
        helpCreateWayRect:
          `כפתורי יצירת מלבנים ייצרו רשימות זמניות לצירוף\\הסרה.\n` +
          `מלבן יצוייר ע"י גרירת העכבר.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.create.baseStands.wayPoly
        helpCreateWayPoly:
          `כפתורי יצירת פוליגונים ייצרו רשימות זמניות לצירוף\\הסרה.\n` +
          `פוליגון יצוייר ע"י קליקים. קליק כפול מסיים.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.create.baseStands.wayList
        helpCreateWayList:
          `בחר יער, אח"כ חלקה, ואז עומדים (מאותה חלקה).\n` +
          `קליקים על תיבות הסימון ייצרו רשימות טיוטה לצירוף\\הסרה.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.create.baseStands.wayReshape
        helpCreateWayReshape:
          `מצב תיקון חופשי.\n` +
          `צייר קו או פוליגון תיקון כדי לשנות את גבול יחידת העבודה.\n` +
          `הקו חייב לחצות את הגבול לפחות פעמיים.\n` +
          `לאחר הציור, אשר או בטל את התיקון.`,

        // Help - state.edit
        helpEdit:
          `בחרת לערוך (לשנות) יחידת עבודה קיימת.\n` +
          `תחילה, עליך לבחור אותה, ע"י הקלקה עליה.`,

        // Help - state.edit.selected
        helpEditSelected:
          `מצב זה אינו קיים`,

        // Help - state.edit.selected.baseStands
        helpEditSelectedBaseStands:
          `במצב עריכה, לאחר בחירת יחידת העבודה,\n` +
          `מוצגים פרטיה הרלוונטיים שאינם ברי החלפה:\n` +
          `זיהוי יחידת העבודה, שם היער, ומקור הגיאומטריה.\n` +
          `\n` +
          `מקור הגיאומטריה הוא עומדים ,\n` +
          `ולכן מוצגת רשימת העומדים המשתייכים אליה.\n` +
          `\n` +
          `עליך לבחור שיטה לצירוף\\הסרת עומדים-\n` +
          `ע"י רשימה, או ע"י אחת משלוש שיטות גרפיות.\n` +
          `ניתן להתחיל בשיטה אחת ולהמשיך בשיטה אחרת.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.`,

        // Help - state.edit.selected.baseStands.wayClick
        helpEditSelectedWayClick:
          `הקלק על עומדים באותו היער של יחידת העבודה,\n` +
          `כדי לצרפם/להסירם.\n` +
          `בכל עת תוכל לעבור לשיטה אחרת\n` +
          `(של בחירת עומדים לצירוף\\להסרה).\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.edit.selected.baseStands.wayRect
        helpEditSelectedWayRect:
          `כפתורי יצירת מלבנים ייצרו רשימות זמניות לצירוף\\הסרה.\n` +
          `מלבן יצוייר ע"י גרירת העכבר.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.edit.selected.baseStands.wayPoly
        helpEditSelectedWayPoly:
          `כפתורי יצירת פוליגונים ייצרו רשימות זמניות לצירוף\\הסרה.\n` +
          `פוליגון יצוייר ע"י קליקים. קליק כפול מסיים.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.edit.selected.baseStands.wayList
        helpEditSelectedWayList:
          `במצב עריכה, היער ידוע.\n` +
          `בחר חלקה, ואז עומדים (מאותה חלקה).\n` +
          `קליקים על תיבות הסימון ייצרו רשימות טיוטה לצירוף\\הסרה.\n` +
          `כפתור "אשר" מעביר מרשימת טיוטה לרשימה הסופית.\n` +
          `כשאין רשימות טיוטה, ניתן להחליף בין שיטות.\n` +
          `כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הסופית אינה ריקה.`,

        // Help - state.edit.selected.baseStands.wayReshape
        helpEditSelectedWayReshape:
          `מצב תיקון חופשי.\n` +
          `צייר קו או פוליגון תיקון כדי לשנות את גבול יחידת העבודה.\n` +
          `הקו חייב לחצות את הגבול לפחות פעמיים.\n` +
          `לאחר הציור, אשר או בטל את התיקון.`,
      });
    },
  };
});
