Documentation for continuing development of custom widget "defineWorkUnit"

In ESRI Experience Builder Developer Edition 1.19





================

\*\*פרק א\*\* על הפרויקט:

================



הפרויקט הינו תכנון ובניית Custom Widget בתוך ESRI Experience Builder Developer Edition, Version 1.19

המסמך הזה משמש כרקע לצורך המשך העבודה.



הנחיות המחייבות אותך לצורך עבודתך על הפרוייקט הזה:

You are an expert of React and of ESRI Experience Builder Developer Edition 1.19

and the modern "geometryOperators"

In this project of mine, there are things to complete.

Please read carefully and thoroughly this Spec.md, the diagrams (all \*.jpg files) and ALL lines of ALL project code files.

Then - read the Spec and the code files again 

Ask questions till whole project design and code are clear and understood fully by you.



Generally, when I'll ask you to do additions and/or modifications or corrections – 

Important: do not modify any code or comment outside the direct scope of your current task

Important: You should not modify files by yourself. Only display to me step by step the needed modifications, paragraph by paragraph, for each file, what should be done and where, step by step, and I'll incorporate and test.



קבצי הווידג'ט:

client/your-extensions/widgets/defineWorkUnit/

-- icon.svg

-- manifest.json

-- tailwind.config.ts (tailwind not used yet)

-- src/

-- -- config/

-- -- -- config.ts

-- -- -- layers.config.ts

-- -- -- mock-data.ts (never tested)

-- -- -- types.ts

-- -- runtime/

-- -- -- translations/

-- -- -- -- default.ts

-- -- -- -- he.js

-- -- -- data-source-utils.ts

-- -- -- map-utils.ts

-- -- -- style.ts

-- -- -- widget.tsx

-- -- setting/

-- -- -- setting.tsx





הווידג'ט נועד לשרת את מנהלי תחזוקת יערות "קרן קיימת לישראל" בהגדירם "יחידות עבודה" לצורך ניהול משימות לפי שטחים.

הווידג'ט נקרא: "הגדרת יחידת עבודה" ובאנגלית: Define Work Unit ושם התיקייה: defineWorkUnit

הוא כתוב ב React כמובן והוא מסוג Function. עבור UI  יוגדרו שפות עברית ואנגלית בלבד.



שכבת יחידות העבודה היא שכבה פוליגונלית בצירוף attributes table. היא כבר קיימת והיא ברת עריכה. 

קרן קיימת לישראל (קק"ל) אחראית על היערות במדינת ישראל.

לצורך ניהול משימות אחזקה ביערות, ישנן 4 שכבות פוליגונליות (המכילות טבלות attribututes) –

שכבות היערות ("forests"), החלקות ("compartments"), העומדים (, for "tree stands""stands"), ויחידות העבודה.



היערות אינם חופפים. כל יער מחולק לחלקות (שאינן חופפות), וכל חלקה מחולקת לעומדים (שאינם חופפים).

שלושת השכבות האלו קיימות ומאוכלסות, כולל ה attributes tables שלהן, והן אינן ברות עריכה.

שכבת יחידות העבודה הינה ברת עריכה, ומשמשת לניהול משימות עבודה, ע"י קביעת שטחים בהן תתבצע כל משימה ופרטי המשימה, וכתיבת\\עדכון רשומות השכבה המכילות את פוליגון יחידת העבודה ואת שדות המידע הנדרש, בטבלת השכבה.



ביערות שונים יכולות להיות חלקות בעלות אותו מספר, ובחלקות שונות יכולים להיות עומדים בעלי אותו מספר.

"יחידת עבודה" משתייכת ליער אחד בלבד, והיא כוללת בדרך כלל כמה עומדים שלמים, מכמה חלקות שונות באותו היער (עבור חלקה, יכולים להיכלל אפס מעומדיה, או אחד, או יותר), אך יחידת עבודה יכולה לכלול גם חלקי עומדים.

אין מניעה שיחידות עבודה יחפפו האחת את השניה באופן מלא או חלקי, באשר מטרתן היא רק לנהל משימות עבודה שנתיות,

ולהגדיר היכן תתבצע כל משימה. פעמים, במקום "יחידת עבודה" נכתוב בקיצור: י"ע



כשאנו מתייחסים ל"עומד", אנו מציינים את מספר החלקה ואת מספר העומד.

למשל: ביער מסוים, הסימול 7-210 מתייחס ל"עומד" מספר 210 בתוך חלקה 7.

כלומר, ביער מסוים, כשנרצה לציין עבור המשתמש עומד מסוים, נציין את מספר החלקה ואת מספר העומד, כשביניהם מקף.

כשנציין שיחידת עבודה מסוימת כוללת את העומדים 100, 110, 120 מחלקה 8, העומדים 200, 210 מחלקה 9, העומד 100 מחלקה 12, ואת העומדים 200, 300 מחלקה 13,

אז כדי לקצר, "רשימת העומדים" הזו תיכתב כך: 8(100,110,120),9(200,210),12(100),13(200,300)

הערות:

(1)	מכיוון שפוליגוני שכבת החלקות רחוקים מלהיות מדוייקים, הווידגט אינו משתמש בשכבת החלקות עצמה, אלא בונה פוליגוני חלקות באופןו וירטואלי, על יסוד המידע שבשכבת העומדים, ופוליגוני העומדים.

(2)	לצורך מהירות, הווידגט משתמש הן בזכרון והן ב localStorage כדי לחסוך בפניות לשרת.



======================================================

\*\*פרק ב\*\* על הווידג'ט עצמו, שלב הפיתוח הנוכחי, ותיאור קצר של השלבים הבאים:

======================================================



הווידג'ט מכיל אפשרות כתיבה וקריאה של יחידת העבודה,

ומבצע הן יצירת יחידת עבודה חדשה, והן עריכת יחידת עבודה קיימת (בשכבת יחידות העבודה) -

הן עריכת הפוליגון, והן עריכת רשומות בטבלה (חלקן כבר עורך בעצמו, ולחלקן יקרא בשלב 3, לוידגט survey123).



הווידג'ט מכיל מנגנון למניעת עריכת יחידת עבודה קיימת בו-זמנית ע"י יותר ממשתמש יחיד.



הווידג'ט מטפל בנושא הגיאומטריה של יחידת העבודה, על בסיס עומדים שלמים, וברשומות הקשורות לכך בטבלה.



עד כאן הכל עבד, כאשר בשלבי יצירה ועריכה, פוליגון יחידת העבודה השלם נוצר רק טרם הכתיבה לשרת, ואילו בזמן היצירה והעריכה, ייצוג יחידת העבודה על המסך היה אוסף עומדים בעלי גבולות כתומים.



כהכנה לשלב 2 (של שינוי פוליגון יחידת העבודה על בסיס ציור חופשי של קו שבור החותך את הפוליגון במספר נקודות,

וכך מוסיף או גורע שטחים), שיניתי, שכבר בשלבי יצירה ועריכה, יחידת העבודה מיוצגת על המסך כפוליגון. גם זה כבר נבדק ועובד.



בשלב 2 הווידג'ט מאפשר שינוי פוליגון יחידת העבודה על בסיס ציור חופשי של קו שבור החותך את הפוליגון במספר נקודות,

בלחיצה על כפתור "צייר קו תיקון" כדי להוסיף או לגרוע שטחים, על בסיס נקודות חיתוך הפוליגון של יחידת העבודה על ידי הקו המצוייר. שלב זה הינו בשלב של debugging. 

הרעיון: "הפוליגון אמור להיות ב wkid:2039 (ITM = Israel Transverse Mercator) ואת הקו גם יש להמיר ל wkid:2039 יש "לזרוק" את הקטעים מתחילת הקו עד לחיתוך הראשון עם הפוליגון, ומסוף הקו אחורה עד החיתוך האחרון עם הפוליגון, ולזכור את כל נקודות החיתוך. עבור כל קטע של הקו השבור בין 2 נקודות חיתוך, יש להבין האם הוא "מחוץ" לפוליגון י"ע או בתוכו. אם הוא מבחוץ, יש ליצור פוליגון קטן של השטח הכלוא בין הקטע הזה לבין הפוליגון, ולבצע union על פוליגון י"ע כדי להגדילו.



The algorithm:

Context: User clicks many points (at least 2) to draw a multiline that crosses the work unit polygon boundary multiple times (at least 2 cross points). The geometry operators split this line at boundary crossings, giving us ordered segments. For each segment we can know for sure whether it is INSIDE or OUTSIDE the polygon, since the start and end points of each segment are on the polygon boundary, So, if the segment has 1 or more  points between its start and end points, all of them  are either inside, or outside (in case the segment contains only its start and end points (the crossings), it is a straight line, so it's safe to create an "additional" mid point and evaluate if it's inside or outside). So, for each segment we know for sure whether it is outside the polygon (thus creating an "outside" pocket) or inside the polygon (thus creating an "inside" pocket).



Goal: Of course all "outside" pockets are to be added, but concerning "inside" segments - each of them can creates 2 pockets, one at "right" and one at "left" (as the user proceeds to click to create the multyline points), so which of them to remove? This could be solved if there is at least one "outside" segment, since we see if its added pocket is RIGHT \[or LEFT] to the segment, so we know that when we encounter a segment inside the polygon, we will remove the pocket at the opposite side (LEFT \[or RIGHT]).



Step 1: So, We scan the segments till we find the first "outside" segment.



Step 2: We create the pocket polygon between this outside segment and the main polygon (outside the polygon), and by walking around the pocket from segment start to segment end and then back along the perimeter "taken" from the polygon, we can evaluate whether we are going CCW or CW - CCW means external pocket is "leftside" to outside segment, so we will remove all pockets rightside to internal segments, and CW means external pocket is "rightside" to outside segment, so we will remove all pockets leftside to internal segments

&nbsp;הפונקציה המבצעת זאת היא applyCorrectionLine. 



כמו כן באותו שלב הוידגט מאפשר שינוי פוליגון יחידת העבודה על ידי ציור פוליגון תיקון. גם כאן אנו בשלב debugging 



When the user draws a polygon, in case we are not sure what is his intention – better to ask him,

&nbsp;So please examine if next logic makes sense:

1\. When a user draws a polygon in an empty area, we are sure he wants to create a new work unit polygon.

2\. When a user draws a polygon which is wholly contained within a work unit polygon, and no "holes" are involved, we are sure he wants to create a "hole".

3\. When a user draws a polygon which covers some area outside work unit polygon (or intersects a hole in it) and part inside work unit polygon area (no matter if it contains whole work unit polygon or polygons, or more or less than 50% of any of them) – we are not sure what is the user intention, so we ASK THE USER – we present a modal dialog box with "Add", "Remove" and "Cancel" buttons ("בטל","הסר","הוסף").

In case user choose "Add", then all that within his polygon will be added.

In case user choose "Remove" – all that is within his polygon will be subtracted (and what was out before, will remain out, no "XOR")



גם תיקון ע"י קו שבור וגם תיקון ע"י פוליגון, יודעים לעבוד על עומדים שאינם שלמים, והם מסומנים ברשימות בתצוגה למשתמש ע"י הוספת "\*"



1\.	The "final" list shows the final state versus the ORIGINAL work unit stands as was in the server, according to next cases:

2\.	Stands that were ADDED FROM NOTHING (were not at all in origin w.u. in server) - and now are either whole or partial - bold blue, and if now partial - add "\*".

3\.	Stands REMOVED TOTALLY - were originally in server as whole or partial but now removed totally - old red, strikethrough, and if originally were partial, add "\*".

4\.	Stands that were CHANGED - (on the original work unit in server were either whole or partial, and now still exist but changed size (partial to big or little partial, whole to partial, partial to whole) - bold orange, and if now partial - add "\*".











בקיצור – בנושא זה מצפה לך אתגר לא קטן, ועוד שנושא זה של ציור חופשי אמור לגדול ולהכיל דברים נוספים כגון ציור ידני של פוליגון כדי להוסיפו או להחסירו מיחידת העבודה



בשלב 3, כשהוידגט כותב את יחידת העבודה לשרת, הוא יעדכן מספר שדות נוספים.



בשלב 4, לאחר כתיבת הפוליגון ומספר שדות בסיסיים לשרת, יקרא הווידג'ט לווידג'ט survey123 העוסק במילוי טפסים ויספק לו את זיהוי יחידת העבודה, לצורך מילוי ועריכת יתר שדות המידע של יחידת העבודה.



בשלבים הבאים הוא יטפל בגיאומטריה על בסיס אפשרויות נוספות, הכוללות גם בניית פוליגון י"ע מלכתחילה, לא על בסיס עומדים שלמים אלא על בסיס קו שבור ובאפר סביבו, על בסיס ציור חופשי מלכתחילה, על בסיס פוליגון משכבה אחרת, ועוד אפשרויות.





============================

\*\*פרק ג\*\* -- הנחיות כלליות בנוגע לווידג'ט:

============================



1\. משך כל זמן שמתבצעת פעולה מול השרת, כקריאת נתונים או שמירת נתונים, מימשק המשתמש צריך להיות מושבת על פני כל חלון היישום,

&nbsp;וצריך להופיע "Spinner" בסגנון הספינרים של ESRI שיודיע: "קורא מהשרת" או "שומר לשרת".

2\. כשפעולת קריאה\\כתיבה מול השרת נכשלת, יש להודיע מה השגיאה, ואם רלוונטי - לאפשר למשתמש לנסות שוב.

3\. הווידג'ט יתאים את גובהו באופן שוטף, לגובה התוכן שבתוכו.

4\. כפתורים - אני רוצה שייראו בסגנון של ESRI

(כפתור שניתן ללחוץ עליו - כיתוב שחור על רקע לבן. אם לחצנו והכפתור אקטיבי - הכיתוב לבן על רקע כחול. כפתור "מושבת" - כיתוב לבן על רקע אפור בהיר)

אך עם פינות מעוגלות, ורשימות נפתחות (dropdowns) שייראו בסגנון של ESRI.

5\. כפתור 'סיים ושמור י"ע', במסכים בהם הוא אמור להיות קיים, יופיע וייראה למשתמש אך ורק כאשר רשימת העומדים (ביחידת העבודה) אינה ריקה. והוא יהיה פעיל אך ורק אם רשימת העומדים שונה ממצבה ההתחלתי (למשל אם בתחילה יחידת העבודה כללה עומדים מסוימים, הוספנו והחסרנו עומדים, וחזרנו במקרה בדיוק למצב ההתחלתי, כפתור 'סיים ושמור י"ע' יהיה כבוי.

לאחר לחיצתו, יחידת העבודה תיכתב לשרת, והכפתור יודיע אם הצליח או נכשל, ויחזיר למצב state.init.

6\. כפתור "בטל הכל" מבטל כל שינוי, אם עשינו, ומחזיר למצב state.init. אין צורך בפעולה מול שרת, היות ורק כפתור 'סיים ושמור י"ע' כותב את רשומת יחידת העבודה לשרת (בין אם זו רשומה חדשה, או רשומה קיימת שנערכה ונעשה בה שינוי).

7\. עם ריחוף או לחיצת כפתור "עזרה", יוצג טקסט הדרכה בחלון שיופיע משמאל לווידג'ט (או מימין או מלמטה, אם אין מקום פנוי משמאל). החלון יהא ניתן לסגירה ע"י "X". כשחלון העזרה כבר פתוח ואנו עוברים מצב, הטקסט בחלון העזרה יתחלף. גובה חלון העזרה יותאם אוטומטית לגובה התוכן שבתוכו.

8\. כאשר יחידת עבודה נשמרת לשרת, תיכתב הודעה מפורטת לקונסול, ויוצג Alert מתאים.

8\. אם בשורת הכתובת בכרום יתווסף dbg=log? אז תיכתבנה הודעות נוספות לקונסול לצורך debugging, וזה יוגדר בהמשך, לפי הצורך.

9\. קו ההיקף של יחידת העבודה יוצג בכתום.

10\. קו ההיקף של העומדים ב "רשימת עומדים לצירוף" יוצג בצבע המיועד ל "selected".

10\. קו ההיקף של העומדים ב "רשימת עומדים להסרה" יוצג באדום.





===================

\*\*פרק ד\*\* -- מכונת המצבים:

===================



להלן שמות קבצי דיאגרמות התכנון, והסברים:



01-state.init

02-state.create

03-state.create.baseStands

04-state.create.baseStands.wayClick

05-state.create.baseStands.wayRect

06-state.create.baseStands.wayPoly

07-state.create.baseStands.wayList

08-state.edit

09-state.edit.selected (לא בשימוש, כי כשבחרנו י"ע, בסיס הגיאומטריה שלה ידוע)

10-state.edit.selected.baseStands

11-state.edit.selected.baseStands.wayClick

12-state.edit.selected.baseStands.wayRect

13-state.edit.selected.baseStands.wayPoly

14-state.edit.selected.baseStands.wayList

הסבר:

1\.	מצב 01 – התחלתי. שום דבר לא מוגדר עדיין. 

המשתמש אמור לבחור סוג משימה – יצירה או עריכה

הוא לא יוכל לשנות את סוג המשימה, אלא כשיחזור למצב זה, מכל מצב אחר, או ע"י כפתור "סיים ושמור" או ע"י כפתור "בטל הכל"

2\.	מצב 02 – המשתמש בחר "יצירה". 

עליו לבחור את הבסיס, את "אבני הבניין" לפיהם ייבנה פוליגון יחידת העבודה. 

כעת רק אפשרות "עומדים" פעילה, 

זאת אומרת שפוליגון יחידת העבודה יורכב מצירוף מספר עומדים 

(מאותו יער. כמוסבר למעלה, שיחידת העבודה מוגדרת ליער אחד בלבד)

3\.	מצב 03 – המשתמש בחר "עומדים". 

עליו לבחור דרך בה יצרף\\יסיר עומדים - ע"י רשימה, או ע"י אחת משלוש דרכים גרפיות. 

ניתן להתחיל בדרך אחת ולהמשיך בדרכים אחרות. 

כשאין רשימות טיוטה (להוספה או הסרה), ניתן להחליף בין דרכים.

כלומר – יהא ניתן לעבור הלוך וחזור בין מצבים 04, 05, 06, 07

4\.	מצב 04 – המשתמש בחר להוסיף\\להסיר עומדים ע"י הקלקה. 

על המשתמש להקליק על עומדים באותו יער, כדי לצרפם/להסירם. 

בכל עת יוכל לעבור לדרך אחרת. כלומר ניתן לעבור בין מצבים 4-5-6-7

כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הקבועה אינה ריקה.

5\.	מצב 05 - המשתמש בחר להוסיף\\להסיר עומדים ע"י ציור מלבנים. 

כפתורי יצירת מלבנים ייצרו רשימות זמניות לצירוף\\הסרה. מלבן יצוייר ע"י גרירת העכבר. 

כפתור "אשר" מעביר מרשימת טיוטה לרשימה הקבועה. 

כשאין רשימות טיוטה, ניתן להחליף בין דרכים. כלומר ניתן לעבור בין מצבים 4-5-6-7

כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הקבועה אינה ריקה.

6\.	מצב 06 - המשתמש בחר להוסיף\\להסיר עומדים ע"י ציור פוליגונים. 

כפתורי יצירת פוליגונים ייצרו רשימות זמניות לצירוף\\הסרה. 

פוליגון יצוייר ע"י קליקים. קליק כפול מסיים. 

כפתור "אשר" מעביר מרשימת טיוטה לרשימה הקבועה. 

כשאין רשימות טיוטה, ניתן להחליף בין דרכים. כלומר ניתן לעבור בין מצבים 4-5-6-7

כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הקבועה אינה ריקה.

7\.	מצב 07 - המשתמש בחר להוסיף\\להסיר עומדים ע"י בחירה מרשימה. 

יש לבחור יער (אם לא נבחר עדיין), אח"כ חלקה, ואז להקליק על תיבות הסימון של עומדים (מאותה חלקה). 

קליקים על תיבות הסימון ייצרו רשימות טיוטה לצירוף\\הסרה. 

כפתור "אשר" מעביר מרשימת טיוטה לרשימה הקבועה. 

כשאין רשימות טיוטה, ניתן להחליף בין דרכים. כלומר ניתן לעבור בין מצבים 4-5-6-7

כפתור 'סיים ושמור י"ע' פעיל, כשהרשימה הקבועה אינה ריקה.

8\.	מצב 08 – המשתמש בחר במשימת עריכה. 

יש להכריח ששכבות היערות ויחידות העבודה נראות, ושכבות החלקות והעומדים מוסתרות.

שכבת יחידות העבודה מסוננת כך שתיראינה רק אלו שהן בנות עריכה.

בווידג'ט תופיע הודעה: הקלק על יחידת העבודה 

9\.	מצב 10 – לאחר שבמצב 08 המשתמש הקליק על יחידת עבודה, נתוני יחידת העבודה הקיימת, כולל היער, ומקור הגיאומטריה, ידועים.

לכן – הדרופדאון "מקור הגיאומטריה" מאותחל בהתאם ליחידת העבודה (בשלב ראשון, הוא יאותחל ל "עומדים"), ויוצגו שם היער, שם יחידת העבודה (תוכן שדה TRTUnit), ורשימת העומדים המשתייכים אליה, ומרגע זה אי אפשר לשנות יער.

במצב זה מוצג דרופדאון "שיטת בחירה"

10\.	מצבים 11-14 דומים למצבים המקבילים במשימת "יצירה" אלא:

a.	במשימת עריכה לא ניתן להחליף יער גם אם הסרנו את כל העומדים. אמנם אם הסרנו את כל העומדים, כפתור "שמירה" לא יופיע.

b.	זיהוי יחידת העבודה יופיע בתוך תווית רשימת עומדי יחידת העבודה







================

\*\*פרק ה\*\* -- Tailwind:

================



אם נשתמש בתוסף הזה,

זה יחייב קונפיגורציה מיוחדת:

בתיקיית הווידג'ט יש להוסף קובץ

tailwind.config.js 

האם תוכנו אמור להיות כך?

/\*\* @type {import('tailwindcss').Config} \*/

module.exports = {

&nbsp; // 1. הקידומת החשובה למניעת התנגשויות

&nbsp; prefix: 'tw-', 

&nbsp; 

&nbsp; corePlugins: {

&nbsp;   // 2. ביטול האיפוס הגלובלי (קריטי ל-EXB)

&nbsp;   preflight: false, 

&nbsp; },

&nbsp; 

&nbsp; content: \[

&nbsp;   "./src/\*\*/\*.{js,jsx,ts,tsx}",

&nbsp; ],

&nbsp; theme: {

&nbsp;   extend: {},

&nbsp; },

&nbsp; plugins: \[],

}



==========================

\*\*פרק ו\*\* -- תיאור השכבות הרלוונטיות:

==========================



ו-1)) שכבת היערות: (read-only)

=========



layer title: יער בניהול קק"ל מתארח



שמות שדות רלוונטיים, עם ערכים לדוגמא, והסבר - בתוך סוגריים:



Field name: FOR\_Num

Display name: מספר יער 

Type: int    

לדוגמא: מספר יער: 3416 (שים לב: יחידת עבודה תשתייך ליער אחד בלבד).



Field name: FOR\_Name

Display name: שם יער

Type: string

לדוגמא: שם יער: הזורע





ו-2)) שכבת החלקות: (read-only)

=========



layer title: חלקות יער



שמות שדות רלוונטיים, עם ערכים לדוגמא, והסבר - בתוך סוגריים:



Field name: FOR\_NO

&nbsp;Display name: מספר יער

Type: int

לדוגמא: מספר יער: 3416



Field name: HELKA

Display name: מספר חלקת יער

Type: int

לדוגמא: מספר חלקת יער: 24





ו-3)) שכבת העומדים: (read-only)

==========



layer title: עומדי יער מתעדכנים



שמות שדות רלוונטיים, עם ערכים לדוגמא, והסבר - בתוך סוגריים:



Field name: FOR\_NO

Display name: מספר יער

Type: int

לדוגמא: מספר יער: 3416 (שים לב: יחידת עבודה משתייכת ליער אחד בלבד).



Field name: ForestName

Display name: שם יער

Type: string

לדוגמא: שם יער: הזורע



Field name: HELKA  

Display name: חלקה

Type: int

לדוגמא: חלקה: 6  (שים לב: עומד שייך לחלקה אחת בלבד, כאשר חלקה שייכת ליער אחד בלבד)



Field name: STAND\_NO

Display name: עומד

Type: int

לדוגמא: עומד: 126  





ו-4)) שכבת יחידות העבודה: (writeable)

==============



layer title: KKLForestManagementUnitsTestML



שמות שדות רלוונטיים, עם ערכים לדוגמא, והסבר - בתוך סוגריים:





Field name: FOR\_NO

Display name: מספר יער

Type: string

לדוגמא: מספר יער: 3416 (שים לב: יחידת עבודה משתייכת ליער אחד בלבד).





Field name: FOR\_Name 

Display name: שם יער

Type: string

לדוגמא: שם יער: הזורע





Field name: HELKA

Display name: מספר חלקה

Type: string

לדוגמא: מספר חלקה: 2,3,4,6,8,9,10,14 (ערך השדה הוא מספרי החלקות בהן נמצאים עומדי יחידת העבודה, מופרדים בפסיקים)





Field name: Stands 

Display name: עומדים

Type: string

לדוגמא: עומדים: 2-125, 2-121, 3-118, 8-101, 8-102, 4-109, 4-110, 3-122, 3-121, 4-114, 4-112, 4-111, 4-115, 10-101, 10-103, 9-103, 9-124, 9-128, 14-110, 10-139, 3-120, 3-124, 9-101, 3-123, 8-103, 14-112, 4-116, 8-119, 3-106, 6-110





Field name: TRTUnit 

Display name: יחידת עבודה

Type: string

לדוגמא: יחידת עבודה: T341638 (ערך השדה מורכב מהאות "T", אחריה מספר היער (4 ספרות), ואחריו מספר רץ, הנקבע אוטומטית)





Field name: WPFSRequestStatus 

Display name: סטטוס הבקשה

Type: string



שים לב: 

1\. אם המשתמש ביקש לערוך יחידת עבודה קיימת, אזי אך ורק אם "סטטוס הבקשה" עבורה הינו "בהכנה" או "הוגש למחלקת יער", רק אז היא ניתנת לעריכה. אחרת, יש להציג למשתמש הודעת שגיאה: "יחידת עבודה זו אינה ניתנת לעריכה", ויהא עליו לבחור יחידת עבודה אחרת.

2\. כשהמשתמש יוצר יחידת עבודה חדשה, "סטטוס הבקשה" עבורה יהא "בהכנה"





Display name: חתימת זמן נעילה    Field name: LockTimestamp

Type: Big Int

ערכים אפשריים: null או זמן נוכחי במילישניות מאז 1970

השדה יתפקד במנגנון הנעילה שאינו מאפשר עריכה בו זמנית על ידי יותר ממשתמש יחיד





===============================================

\*\*פרק ז\*\* -- מנגנון "נעילה" למניעת עריכה בו-זמנית ע"י שני משתמשים:

===============================================



להלן הגדרת מנגנון ה"נעילה" המיועד למנוע שינוי טבלת יחידות העבודה בו זמנית ע"י יותר ממשתמש אחד:

=====================================================================

Locking Mechanism - Overview

==========================

Mechanism Name: Pessimistic Locking with Heartbeat (using a Time-Based Lease).



Target: To prevent data corruption or "lost updates" by ensuring that only one user at a time can edit a specific record.



How it Works:



Checking In: When you click 'עריכה' (or 'עריכת י"ע קיימת') the system checks a "LockTimestamp" record.

&nbsp;    If the time is empty or older than 25 seconds old, the system "claims" the record by writing your current time into it.



Verification: IMMEDIATELY after writing, the system double-checks to make sure

&nbsp;    it was actually your time that was saved and not someone else's who clicked at nearby time,

&nbsp;    in order to enable user to enter "edit" mode and start editing.



Keeping it Alive (Heartbeat): While you are editing the table,

&nbsp;    your browser automatically updates this LockTimestamp every 15 seconds to current time.

&nbsp;    This tells everyone else: "I am still here and actively working."



Automatic Release: When you click "שמור" or "בטל הכל", the LockTimestamp is cleared (to 0).

&nbsp;   If your computer crashes or you lose internet, the LockTimestamp will naturally "expire" after 25 seconds,

&nbsp;   allowing others to edit without needing a manual reset.



Waiting List: If you try to edit a record that is already claimed, the system will show you a modal dialog box with proper message,

&nbsp;    and the system will automatically re-check every 25 seconds to see if the previous user has finished.

&nbsp;    The dialog box will also contain a button to cancel.





Locking Mechanism - details

=======================

Robust Pessimistic Locking with BigInt

Project Context:



Environment: ESRI Experience Builder (Developer Edition) - Custom React Widget.

Library: ArcGIS Maps SDK for JavaScript (@arcgis/core).

Target Field: LockTimestamp (Type: BigInt / Double).



System Constants:

LOCK\_TIMEOUT = 25000 (25 seconds: Time until a lock is considered stale).

HEARTBEAT\_INTERVAL = 15000 (15 seconds: Frequency to refresh the lock).

POLLING\_INTERVAL = 25000 (25 seconds: Frequency to re-check availability when busy).

TIME\_TOLERANCE = 10 (Small buffer for numerical comparison).



1\. State \& Refs

isEditing: Boolean (True when the user successfully owns the lock).

isWaiting: Boolean (True when the table is busy (by another user) and the user is in the polling/dialog state).

lastLockedTimeRef: A useRef to store the exact BigInt/Number timestamp successfully written to the DB.



2\. Core Function: acquireLock

Implement an async function that performs the "Try-Verify" pattern:



Initial Check: Query the feature. If LockTimestamp != null AND (Date.now() - LockTimestamp < LOCK\_TIMEOUT), return false.

Else – attempt to acqire:

The Attempt: Generate const myTimestamp = Date.now(). Update the feature setting LockTimestamp = myTimestamp.

The Verification: Immediately query the feature again.

If (dbValue == myTimestamp), the lock is successful. Update lastLockedTimeRef.current = dbValue and return true.

Otherwise, another user won the race. Return false.



3\. UI Logic: Edit \& Waiting Dialog

Edit Button Click: Call acquireLock.

If true: Set isEditing = true.

If false: Set isWaiting = true.

Waiting Modal: If isWaiting is true, display a blocking Dialog Box:

Message: "Table is currently being edited. Rechecking every 25 seconds..."

Cancel Button: Must provide a button to set isWaiting = false and stop all polling.



4\. Background Effects (Lifecycle)

Heartbeat (useEffect): While isEditing is true, run a setInterval (15s).

Update LockTimestamp with a new Date.now().

Crucial: Always verify the write was successful. If the DB value doesn't match your new timestamp,

&nbsp;            call a handleLockLost() function to force-exit edit mode.

Polling (useEffect): While isWaiting is true, run a setInterval (25s) that calls acquireLock. If it returns true, set isWaiting = false.



5\. Release \& Cleanup

Release Function: Set LockTimestamp = null (or 0).

Triggers: Call release on "שמור", "בטל הכל", and window.beforeunload.

Cleanup: Ensure all intervals are cleared when the component unmounts.









