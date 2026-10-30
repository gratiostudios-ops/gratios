import React from 'react';
import CaretDown from '../../assets/phosphor/ui-caret-down.svg';
import ArrowRight from '../../assets/phosphor/ui-arrow-right.svg';
import Check from '../../assets/phosphor/ui-check.svg';
import Plus from '../../assets/phosphor/ui-plus.svg';
import Minus from '../../assets/phosphor/ui-minus.svg';
import Tasks from '../../assets/phosphor/ui-check-square.svg';
import Bell from '../../assets/phosphor/ui-bell.svg';
import Close from '../../assets/phosphor/ui-x.svg';

const icons = { 'caret-down': CaretDown, 'arrow-right': ArrowRight, check: Check, close: Close, plus: Plus, minus: Minus, tasks: Tasks, bell: Bell };
export function PhosphorIcon({ name, size = 20, color = '#929292' }: { name: keyof typeof icons; size?: number; color?: string }) {
  const Component = icons[name];
  return <Component width={size} height={size} color={color} />;
}
