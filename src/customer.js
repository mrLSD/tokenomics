//
// Copyright 2018 Wireline, Inc.
//

import { Util } from './util';
import { Account } from './bank';

/**
 * Consumer of service.
 */
export class Consumer {

  _account;

  // Service contracts.
  _contracts = [];

  constructor(balance=1) {
    this._account = new Account(balance);
  }

  get account() {
    return this._account;
  }

  get contracts() {
    return this._contracts;
  }
}

/**
 * Consumer.
 */
export class Customer extends Consumer {

  _id = Util.name();

  get id() {
    return this._id;
  }

  get account() {
    return this._account;
  }

  get info() {
    return {
      account: this._account.info,
    };
  }
}
