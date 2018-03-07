//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';
import Chance from 'chance';

/**
 *
 */
export class Model {

  static fixed(n) {
    return Number(n.toFixed(5));
  }

  static _chance = new Chance();

  static seed(n) {
    this._chance = new Chance(n);
  }

  static name() {
    return _.join(_.times(3, () => Model._chance.word()), '-');
  }

  _bank = null;
  _services = new Map();
  _consumers = new Map();
  _turns = 0;

  constructor(bank) {
    this._bank = bank;
  }

  toString() {
    return JSON.stringify(this.info);
  }

  get info() {
    // TODO(burdon): ???
    let gdp = _.reduce(Array.from(this._services.values()), (sum, service) => (sum + service._account), 0);

    return {
      bank: this._bank.info,
      turns: this._turns,
      services: this._services.size,
      consumers: this._consumers.size,
      gdp
    };
  }

  addService(service) {
    this._services.set(service._id, service);
    return this;
  }

  addConsumer(consumer) {
    this._consumers.set(consumer._id, consumer);
    return this;
  }

  run(n=1) {
    _.times(n, () => {

      // Spend.
      this._consumers.forEach(consumer => {

        // Find best prices.
        let service = this.getServiceByLowestPrice();

        // Allocate.
        this._bank.transaction(consumer, service);
      });

      this._turns++;
    });
  }

  getServiceByLowestPrice() {
    let best = null;

    this._services.forEach(service => {
      if (!best || service._price < best._price) {
        best = service;
      }
    });

    return best;
  }
}

/**
 *
 */
export class Bank {

  _taxRate;

  _reserve = 0;
  _gdp = 0;

  constructor(taxRate=0.01) {
    this._taxRate = Model.fixed(taxRate);
  }

  toString() {
    return JSON.stringify(this.info);
  }

  get info() {
    return {
      taxRate: this._taxRate,
      reserve: this._reserve,
      gdp: this._gdp
    };
  }

  transaction(consumer, service) {

    // TODO(burdon): Tax both sides.
    // TODO(burdon): Discount both sides based on staking.

    // Calculate amount spent.
    let budget = consumer._budget;
    let price = service._price;
    let taxedPrice = Model.fixed(price * (1 + this._taxRate));
    let transactions = Math.floor(budget / taxedPrice);
    let spend = Model.fixed(transactions * taxedPrice);

    // Take tax.
    let tax = this.calculateTax(service, spend);
    this._gdp = Model.fixed(this._gdp + spend);
    this._reserve = Model.fixed(this._reserve + tax);

    // Spend.
    consumer._spent = Model.fixed(consumer._spent + spend);
    consumer._transactions += transactions;

    // Income.
    service._account = Model.fixed(service._account + (spend - tax));
  }

  calculateTax(service, spend) {
    return Model.fixed(spend * this._taxRate);
  }
}

/**
 *
 */
export class Service {

  _id = Model.name();

  _price;
  _account = 0;
  _stake = 0;

  constructor(price=1) {
    this._price = price;
  }
}

/**
 *
 */
export class Consumer {

  // TODO(burdon): Model account?

  _id = Model.name();

  _budget;
  _spent = 0;
  _stake = 0;
  _transactions = 0;

  constructor(budget=1) {
    this._budget = budget;
  }
}
