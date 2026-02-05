import { type ImmutableArray, type ImmutableObject } from 'jimu-core'

export enum DisplayOrderType {
  xy = 'XY',
  yx = 'YX'
}

export enum WidgetStyleType {
  classic = 'CLASSIC',
  modern = 'MODERN'
}

export enum ElevationUnitType {
  metric = 'METRIC',
  imperial = 'IMPERIAL'
}

export interface MapInfo {
  id: string
  title: string
  wkid: string
  label: string
  csUnit: string
}

export interface WidgetRect {
  width: number
  height: number
}

export interface CoordinateConfig {
  id: string
  name: string
  wkid: string
  crs?: any
  displayUnit: string
  elevationUnit?: ElevationUnitType
  datumWkid?: string
  datumName?: string
  datumWkid2?: string
  datumName2?: string
}

export interface Config {
  coordinateSystem: ImmutableArray<CoordinateConfig>
  coordinateDecimal: number
  altitudeDecimal: number
  showSeparators: boolean
  displayOrder: DisplayOrderType
  widgetStyle: WidgetStyleType
  mapInfo?: MapInfo
  mapInfo2?: MapInfo
  //_ml_ added block top
  showBaseMapInfo: boolean
  showScale: boolean
  showZoom: boolean
  showTilt: boolean
  showRotation: boolean
  tabDiagonalProject: boolean
  ofekCfgObliqueAppUrl: string
  ofek3dAppUrl: string
  token: string
  //_ml_ added block end
}

export type IMConfig = ImmutableObject<Config>
