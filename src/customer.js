//
// Copyright 2018 Wireline, Inc.
//

import { Util } from './util';

/**
 * Consumer.
 */
export class Customer {

  _id = Util.name();

  _budget;
  _stake;

  _spent = 0;
  _invocations = 0;

  constructor(budget = 1, stake = 0) {
    this._budget = budget;
    this._stake = stake;
  }

  get info() {
    return {
      budget: this._budget,
      invocations: this._invocations,
      spent: this._spent,
      stake: this._stake
    };
  }
}