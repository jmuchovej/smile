import type { StepState } from "./StepState";

/**
 * @class StepperProxy
 * @description Proxy handler for TableAPI objects that handles array-like access
 */
class StepperProxy<T extends StepState = StepState> implements ProxyHandler<T> {
  target: T;

  /**
   * Creates a new StepperProxy handler for the target
   * @param {TableAPI} target - The target TableAPI object
   */
  constructor(target: T) {
    this.target = target;
  }

  /**
   * Wraps the target in a proxy that routes property access through this handler
   * @param {TableAPI} target - The target TableAPI object
   * @returns {Proxy} A proxy for the target object
   */
  static wrap<T extends StepState>(target: T): T {
    return new Proxy(target, new StepperProxy(target));
  }

  /**
   * Handles property access through the proxy
   * @param {TableAPI} target - The target TableAPI object
   * @param {string|number} prop - The property being accessed
   * @returns {*} The value of the property
   */
  get(target: T, prop: string | symbol): unknown {
    //console.log('get', prop)
    // Handle array/object access
    if (typeof prop === "string") {
      let key: string | number = prop;
      // Convert string numbers to actual numbers
      if (/^-?\d+$/.test(key)) {
        key = parseInt(key);
      }

      // Handle negative indices first
      if (typeof key === "number") {
        if (key < 0) {
          key = target._states.length + key;
          // If still negative after adjustment, return undefined
          if (key < 0) return undefined;
        }
      }

      // IMPORTANT: We first try to get a child node by id before checking properties/methods
      // This ensures that child nodes with ids matching getter names (like 'parent')
      // take precedence over the getter methods
      const node = target.getNode(key);
      if (node) {
        return node;
      }
      // If no child node found, then check for properties/methods
      if (key in target) {
        return target[key as keyof T];
      }
      return undefined;
    }
    return target[prop as keyof T];
  }
}

export default StepperProxy;
