import { classNames, isRecord, type ClassValue } from '@/css/classnames.js';

export interface BlockFn {
  (...mods: ClassValue[]): string;
}

export interface ElemFn {
  (elem: string, ...mods: ClassValue[]): string;
}

/**
 * Applies mods to the specified element.
 * @param element - element name.
 * @param mod - mod to apply.
 */
function applyMods(element: string, mod: ClassValue): string {
  if (Array.isArray(mod)) {
    return classNames(mod.map(m => applyMods(element, m)));
  }
  if (isRecord(mod)) {
    const nested = Object.entries(mod).map(([modName, value]) => value ? applyMods(element, modName) : undefined);
    return classNames(...nested);
  }
  const v = classNames(mod);
  return v && `${element}--${v}`;
}

/**
 * Computes final classname for the specified element.
 * @param element - element name.
 * @param mods - mod to apply.
 */
function computeClassnames(element: string, ...mods: ClassValue[]): string {
  return classNames(element, applyMods(element, mods));
}

/**
 * @returns A tuple, containing two functions. The first one generates classnames list for the
 * block, the second one generates classnames for its elements.
 * @param block - BEM block name.
 */
export function bem(block: string): [BlockFn, ElemFn] {
  return [
    (...mods) => computeClassnames(block, mods),
    (elem, ...mods) => computeClassnames(`${block}__${elem}`, mods),
  ];
}