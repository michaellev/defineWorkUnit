System.register([], (function (e) {
  return {
    execute: function () {
      e({//_ml_ modified next line (no comment there since it'll appear in EXB design panel) 
        _widgetLabel: "קואורדינטות-אופק",
        mapClickTips: "לחץ במפה, לבחירת מיקום (לחץ על הכפתור הכחול לביטול)",//_ml_ modified
        mouseMoveTips: "הזז את הסמן כדי לקבל את הקואורדינטות",
        enableClickTips: `כניסה למצב לכידת מיקום`,//_ml_ modified
        disableClickTips: `חזרה למצב הרגיל`,//_ml_ modified
        computing: "מחשב...",
        changeSystem: "בחר את מערכת קואורדינטות פלט",
        eyeAlt: "ג. מבט",//_ml_ modified was " גובה העין ({alt})"
        elev: "ג. סמן",//_ml_ modified was "גובה ({ele})"
        //_ml_ added block top
        eyeTilt: "עילרוד",
        meter: "מטר",
        scale: `קנה מידה`,
        zoom: `זום`,
        heading: `כיוון`,
        promptMsgChooseNewTab: `בחר איזה יישום ייפתח בכרטיסיה חדשה` +
          `\nע"י אות יחידה - g או v או d` +
          `\nלבחירת יישום: גוגל-מפות / גוב-מאפ / פרויקט-אלכסוני` +
          `\nביטול - תתבצע לכידת קואורדינטה בלבד, ללא פתיחת כרטיסיה חדשה`,
        newTabModalPrompt: `בחר פעולה למיקום זה`,
        cancelNewTab: "לכידת המיקום במפה",
        googleMap: "פתיחת גוגל מפות",
        govMap: "פתיחת גוב מאפ",
        ofek3dApp: "פתיחת אופק תלת ממד",
        diagonalProject: "פתיחת פרויקט אלכסוני",
        //_ml_ added block end
      })
    }
  }
}));