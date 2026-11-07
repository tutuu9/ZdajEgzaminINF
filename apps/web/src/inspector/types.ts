export interface InspectionSource {
  path: string;
  range?: { from: number; to: number };
  note?: string;
}

export interface InspectionElement {
  id: string;
  tag: string;
  label: string;
  parentId?: string;
  source: InspectionSource;
}

export interface InspectionCondition {
  kind: 'media' | 'supports' | 'unsupported';
  text: string;
}

export interface InspectionDeclaration {
  id: string;
  property: string;
  value: string;
  source: InspectionSource;
}

export interface InspectionRule {
  id: string;
  selector: string;
  source: InspectionSource;
  declarations: InspectionDeclaration[];
  conditions: InspectionCondition[];
  inlineElementId?: string;
}

export interface InspectionIndex {
  generation: string;
  entry: string;
  attribute: string;
  elements: InspectionElement[];
  rules: InspectionRule[];
  note?: string;
}

export const INSPECTED_PROPERTIES = [
  'display',
  'position',
  'box-sizing',
  'width',
  'height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'gap',
  'justify-content',
  'align-items',
  'overflow',
  'opacity',
] as const;

export type InspectedProperty = (typeof INSPECTED_PROPERTIES)[number];
export interface InspectionSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface InspectionBox {
  rect: { x: number; y: number; width: number; height: number };
  margin: InspectionSides;
  padding: InspectionSides;
  border: InspectionSides;
  content: { width: number; height: number };
  viewport: { width: number; height: number };
  precise: boolean;
  note?: string;
}

export interface InspectionMatch {
  ruleId: string;
  active: boolean;
  inheritedFrom?: string;
}

export interface InspectionSelection {
  elementId: string;
  matches: InspectionMatch[];
  computed: Partial<Record<InspectedProperty, string>>;
  box: InspectionBox;
}

export type InspectionMessage =
  | {
      type: 'zdaj-inspector';
      kind: 'select' | 'update';
      generation: string;
      selection: InspectionSelection;
    }
  | { type: 'zdaj-inspector'; kind: 'exit'; generation: string };

export interface InspectionSelectCommand {
  type: 'zdaj-inspector-select';
  generation: string;
  elementId: string;
}
