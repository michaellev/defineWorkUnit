/** @jsx jsx */
/**
 * setting.tsx
 * Settings panel for DefineWorkUnit widget
 * 
 * Simple settings - just map widget selection
 * Layer DataSources are found automatically at runtime by layer title
 */

import { React, jsx } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { 
  MapWidgetSelector,
  SettingSection, 
  SettingRow 
} from 'jimu-ui/advanced/setting-components';

/**
 * Widget configuration interface
 */
interface Config {
  // Currently no custom config needed
  // Layers are found by title at runtime
}

/**
 * Settings component
 */
export default function Setting(props: AllWidgetSettingProps<Config>) {
  
  const { useMapWidgetIds } = props;

  /**
   * Handle map widget selection
   */
  const onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds: useMapWidgetIds
    });
  };

  return (
    <div className="widget-setting-define-work-unit">
      {/* Map Widget Selection */}
      <SettingSection
        title="בחירת מפה"
        className="map-selector-section"
      >
        <SettingRow>
          <MapWidgetSelector
            onSelect={onMapWidgetSelected}
            useMapWidgetIds={useMapWidgetIds}
          />
        </SettingRow>
      </SettingSection>

      {/* Info Section */}
      <SettingSection
        title="מידע"
        className="info-section"
      >
        <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
          <p><strong>שכבות נדרשות במפה:</strong></p>
          <ul style={{ margin: '5px 0', paddingRight: '20px' }}>
            <li>יער בניהול קק"ל מתארח</li>
            <li>חלקות יער</li>
            <li>עומדי יער מתעדכנים</li>
            <li>יחידות עבודה טיפול יערני פוליגונלי בדיקות</li>
          </ul>
          <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
            הווידג'ט ימצא את השכבות אוטומטית לפי שמותיהן.
          </p>
        </div>
      </SettingSection>
    </div>
  );
}
