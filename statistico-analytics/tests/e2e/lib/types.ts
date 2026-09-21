export type AuditResult =
  | 'INTERACTION_PASS'
  | 'EFFECT_PASS'
  | 'NEEDS_EXPECTATION'
  | 'FAIL_VISIBLE_CLICK'
  | 'FAIL_KEYBOARD'
  | 'INTENTIONALLY_DISABLED'
  | 'NOT_REACHED';

export type YesNo = 'yes' | 'no' | 'n/a';

export interface CheckboxRow {
  module: string;
  route: string;
  viewport: string;
  checkbox: string;
  selector: string;
  source: string;
  native: boolean;
  click: YesNo;
  label: YesNo;
  keyboard: YesNo;
  stateChanged: YesNo;
  focusTarget?: string;
  focusVisible?: YesNo;
  intendedEffect: string;
  consoleError: string;
  result: AuditResult;
  notes: string;
  screenshot?: string;
  defects?: string[];
}

export interface EffectCheck {
  description: string;
  assert: (page: import('@playwright/test').Page, checked: boolean) => Promise<boolean>;
}

export interface CheckboxContract {
  id: string;
  module: string;
  route: string;
  name: string;
  locator: string;
  expectedInitial?: boolean;
  intentionallyDisabled?: boolean;
  effect?: EffectCheck;
}

export interface ModuleSpec {
  id: string;
  name: string;
  route: string;
  source: string;
  prepare?: string[];
}
