//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';

import { Util } from './util';

/**
 * Economic Model.
 */
export class Model {

  _bank = null;
  _services = new Map();
  _customers = new Map();
  _ledger = [];
  _turns = 0;

  constructor(bank) {
    this._bank = bank;
  }

  toString() {
    return JSON.stringify(this.info);
  }

  get info() {
    // Check all money accounted for.
    let serviceIncome = _.reduce(Array.from(this._services.values()), (sum, service) => (sum + service._account), 0);
    console.assert(Util.fixed(serviceIncome + this._bank._grossIncome) === this._bank._grossRevenue);

    return {
      bank: this._bank.info,
      turns: this._turns,
      services: this._services.size,
      customers: this._customers.size,
      serviceIncome
    };
  }

  get services() {
    return _.chain(Array.from(this._services.values()))
      .keyBy('_id')
      .mapValues(obj => obj.info)
      .value();
  }

  get customers() {
    return _.chain(Array.from(this._customers.values()))
      .keyBy('_id')
      .mapValues(obj => obj.info)
      .value();
  }

  get backers() {
    return [];
  }

  get ledger() {
    return _.chain(this._ledger)
      .mapValues(obj => obj._data)
      .value();
  }

  addService(service) {
    this._services.set(service._id, service);
    this._bank._stakes += service._stake;
    return this;
  }

  addConsumer(customer) {
    this._customers.set(customer._id, customer);
    return this;
  }

  getServiceByLowestPrice(budget) {
    let best = null;
    let bestPrice = 0;

    this._services.forEach(service => {
      let price = this._bank.calculateDicountedPrice(service, budget);
      if (!best || price < bestPrice) {
        best = service;
        bestPrice = price;
      }
    });

    return best;
  }

  run(n=1) {
    _.times(n, () => {

      // Spend.
      this._customers.forEach(customer => {

        // Find best prices.
        let service = this.getServiceByLowestPrice(customer._budget);

        // Allocate.
        let transaction = this._bank.transaction(customer, service);
        if (transaction) {
          this._ledger.push(transaction);
        }
      });

      this._turns++;
    });
  }
}

