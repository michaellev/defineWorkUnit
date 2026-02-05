// coordinates-ofek/src/legal/legalConfig.ts _ml_ new file
import type { LegalConfig } from './legalTypes';

export const legalConfigFromFile: LegalConfig = {
  "LEGAL_SETTING_UNCONDITIONED": "MichaelAndGaya",
  "LEGAL_SETTING_CONDITIONED": "Ofek-Haifa",
  "LEGAL_URL_OPTIONS_ARR": [
    "https://mlev-pc-hp:",
    "https://oapgis.ofekonline.com/",
    "https://gisint.haifa.muni.il/portal/apps/experiencebuilder/",
    //"https://gisint.haifa.muni.il/portal/apps/experiencebuilder/experience/",
    //"https://gisint.haifa.muni.il/portal/apps/experiencebuilder/template/",
  ],
  //LEGAL_LAST_DATE": "2025-12-31",//format: yyyy-mm-dd   
  "LEGAL_LAST_DATE": "no-last-date",//uncomment this line for no date limit
  "NO_LAST_DATE": "no-last-date" //if LEGAL_LAST_DATE === NO_LAST_DATE, then no date limit
};
