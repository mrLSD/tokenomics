//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';

/**
 * Economic Model.
 */
export class Model {

  _bank = null;
  _services = new Map();
  _backers = new Map();
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
    // TODO(burdon): Track spending and check all balances out.
    let values = _.reduce(Array.from(this._services.values()),
      (sum, service) => ({
        income: (sum.income + service.income),
        taxes: (sum.taxes + service.taxes),
      }) , {
        income: 0,
        taxes: 0
      });

    return {
      turns: this._turns,

      values,

      bank: this._bank.info,
      services: this.services,
      backers: this.backers,
      customers: this.customers,

      ledger: this.ledger
    };
  }

  get bank() {
    return this._bank;
  }

  get services() {
    return _.chain(Array.from(this._services.values()))
      .keyBy('_id')
      .mapValues(obj => obj.info)
      .value();
  }

  get backers() {
    return _.chain(Array.from(this._backers.values()))
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

  get ledger() {
    return _.chain(this._ledger)
      .mapValues(obj => obj.info)
      .value();
  }

  addServices(services) {
    _.each(services, service => {
      this._services.set(service._id, service);
    });

    return this;
  }

  addBackers(backers) {
    _.each(backers, backer => {
      this._backers.set(backer._id, backer);
    });

    return this;
  }

  addCustomers(customers) {
    _.each(customers, customer => {
      this._customers.set(customer._id, customer);
    });

    return this;
  }

  run(n=1) {
    _.times(n, () => {

      // Execute contracts.
      this._customers.forEach(customer => {
        _.each(customer.contracts, contract => {
          let transaction = contract.execute(this._bank.taxRate);
          if (transaction) {
            let { tax=0 } = transaction;

            this._bank.addRevenue(tax);

            this._ledger.push(transaction);
          }
        });
      });

      // TODO(burdon): Redistribute taxes based on staking.

      this._turns++;
    });
  }
}
