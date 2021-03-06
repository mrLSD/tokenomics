//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';
import uuidv4 from 'uuid/v4';

import { Util } from './util';

/**
 * Bank.
 */
export class Bank {

  _taxRate;
  _grossRevenue = 0;
  _disbursements = 0;
  _reserve = new Account();

  constructor(taxRate = 0) {
    this._taxRate = Util.fixed(taxRate);
  }

  toString() {
    return JSON.stringify(this.info);
  }

  get info() {
    return {
      taxRate: this._taxRate,
      grossRevenue: this._grossRevenue,
      disbursements: this._disbursements,
      reserve: this._reserve.balance
    };
  }

  get taxRate() {
    return this._taxRate;
  }

  addRevenue(revenue) {
    this._grossRevenue += revenue;
    this._reserve.add(revenue);
  }

  addDisbursement(amount) {
    this._disbursements += amount;
    this._reserve.add(-amount);
  }
}

/**
 * Account.
 */
export class Account {

  _balance;

  constructor(balance=0) {
    this._balance = balance;
  }

  spend(contract) {
    if (this._balance > contract.price) {
      this._balance -= contract.price;
      return true;
    }
  }

  get balance() {
    return this._balance;
  }

  get info() {
    return this._balance;
  }

  add(amount) {
    this._balance += amount;
    return this.balance;
  }
}

/**
 * Transaction.
 */
export class Transaction {

  _data;

  constructor(data) {
    this._data = _.defaults({
      id: uuidv4()
    }, data);
  }

  get info() {
    return this._data;
  }
}
