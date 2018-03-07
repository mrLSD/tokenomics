//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';
import Chance from 'chance';

/**
 * Economic Model.
 */
export class Model {

  // TODO(burdon): Extract to utils.

  static fixed(n) {
    return Number(n.toFixed(5));
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
        Model._chance.country({ full: true }).replace(/ /g, '-').toLowerCase(),
        Model._chance.animal({ type: 'pet' }).replace(/ /g, '-').toLowerCase(),
      ];

      let name = _.join(words, '-');
      if (!Model.names.has(name)) {
        Model.names.add(name);
        return name;
      }
    }

//  return _.join(_.times(3, () => Model._chance.word({ syllables: 1 })), '-');
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
    // Check all money accounted for.
    let accounts = _.reduce(Array.from(this._services.values()), (sum, service) => (sum + service._account), 0);
    console.assert(Model.fixed(accounts + this._bank._income) === this._bank._gdp);

    return {
      bank: this._bank.info,
      turns: this._turns,
      services: this._services.size,
      consumers: this._consumers.size,
      accounts
    };
  }

  get services() {
    return _.chain(Array.from(this._services.values()))
      .keyBy('_id')
      .mapValues(s => s.info)
      .value();
  }

  get consumers() {
    return _.chain(Array.from(this._consumers.values()))
      .keyBy('_id')
      .mapValues(s => s.info)
      .value();
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
        let service = this.getServiceByLowestPrice(consumer._budget);

        // Allocate.
        this._bank.transaction(consumer, service);
      });

      this._turns++;
    });
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
}

/**
 * Bank.
 */
export class Bank {

  _taxRate;
  _reserve;

  _income = 0;
  _gdp = 0;

  constructor(taxRate=0.01, reserve=0) {
    this._taxRate = Model.fixed(taxRate);
    this._reserve = reserve;
  }

  toString() {
    return JSON.stringify(this.info);
  }

  get info() {
    return {
      taxRate: this._taxRate,
      reserve: this._reserve,
      income: this._income,
      gdp: this._gdp
    };
  }

  transaction(consumer, service) {

    // Calculate amount spent.
    let budget = consumer._budget;
    let price = this.calculateDicountedPrice(service, budget);

    // Calculate budget.
    let taxedPrice = Model.fixed(price * (1 + this._taxRate));
    let transactions = Math.floor(budget / taxedPrice);
    let spend = Model.fixed(transactions * taxedPrice);

    // Take tax.
    let tax = this.calculateTax(service, spend);
    this._gdp = Model.fixed(this._gdp + spend);
    this._reserve = Model.fixed(this._reserve + tax);
    this._income = Model.fixed(this._income + tax);

    // Spend.
    consumer._spent = Model.fixed(consumer._spent + spend);
    consumer._transactions += transactions;

    // Income.
    service._account = Model.fixed(service._account + (spend - tax));
    service._transactions += transactions;
  }

  calculateTax(service, spend) {
    return Model.fixed(spend * this._taxRate);
  }

  // TODO(burdon): Calculate adjusted price based on staking and volume. Bank has to pay for it.
  // E.g., calculate global percentage of stake and proportionally allocate discount on volume. Need volume?
  // Ensure that reserve is met after all turns (can't do iteratively).

  /**
   *
   * @param service
   * @param budget
   * @return {*}
   */
  calculateDicountedPrice(service, budget) {
    if (!service._stake) {
      return service._price;
    }

    // TODO(burdon): Calculate discount based on percentage of stake and volume.
    // TODO(burdon): Maintain bank minimal reserve.

    let totalStake = 10;

    // TODO(burdon): Our relative stake.
    let stakingPercentage = totalStake / service._stake;

    // TODO(burdon): Maximal discount to maintain reserve (considering all other transaction).
    // E.g., allocate worst case discount?
    let reservePercentage = this._reserve / budget;

    let discount = 0;

    return Model.fixed(service._price * (1 - discount));
  }
}

/**
 * Service.
 */
export class Service {

  _id = Model.name();

  _price;
  _stake;

  _account = 0;
  _transactions = 0;

  constructor(price=1, stake=0) {
    this._price = price;
    this._stake = stake;
  }

  get info() {
    return {
      price: this._price,
      transactions: this._transactions,
      account: this._account,
      stake: this._stake
    };
  }
}

/**
 * Consumer.
 */
export class Consumer {

  // TODO(burdon): Model account?

  _id = Model.name();

  _budget;
  _stake;

  _spent = 0;
  _transactions = 0;

  constructor(budget=1, stake=0) {
    this._budget = budget;
    this._stake = stake;
  }

  get info() {
    return {
      budget: this._budget,
      transactions: this._transactions,
      spent: this._spent,
      stake: this._stake
    };
  }
}
