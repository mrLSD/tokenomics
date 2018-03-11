//
// Copyright 2018 Wireline, Inc.
//

import { Util } from './util';

/**
 * Service.
 */
export class Service {

  _id = Util.name();

  _price;
  _stake;

  _account = 0;
  _invocations = 0;

  constructor(price = 1, stake = 0) {
    this._price = price;
    this._stake = stake;
  }

  get info() {
    return {
      price: this._price,
      invocations: this._invocations,
      account: this._account,
      stake: this._stake
    };
  }
}