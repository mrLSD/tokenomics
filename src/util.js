//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';

import { Chance } from 'chance';

/**
 * Utils.
 */
export class Util {

  /**
   * Fixed precision.
   */
  static fixed(n) {
    return Number(n.toFixed(10));
  }

  static _chance = new Chance();

  static seed(n) {
    this._chance = new Chance(n);
  }

  static names = new Set();

  static name() {
    let running = true;
    while (running) {
      let words = [
        Util._chance.country({ full: true }).replace(/ /g, '-').toLowerCase(),
        Util._chance.animal({ type: 'pet' }).replace(/ /g, '-').toLowerCase(),
      ];

      let name = _.join(words, '-');
      if (!Util.names.has(name)) {
        Util.names.add(name);
        return name;
      }
    }
  }
}