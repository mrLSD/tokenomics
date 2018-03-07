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
    console.assert(Model.fixed(serviceIncome + this._bank._grossIncome) === this._bank._grossRevenue);

    return {
      bank: this._bank.info,
      turns: this._turns,
      services: this._services.size,
      consumers: this._consumers.size,
      serviceIncome
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

  get ledger() {
    return this._ledger;
  }

  addService(service) {
    this._services.set(service._id, service);
    this._bank._stakes += service._stake;
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
        this._ledger.push(this._bank.transaction(consumer, service));
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
  _stakes = 0;

  _grossIncome = 0;
  _grossRevenue = 0;

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
      stakes: this._stakes,
      grossIncome: this._grossIncome,
      grossRevenue: this._grossRevenue
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
    let income = Model.fixed(transactions * service._price);

    let discount = Model.fixed(service._price - price);
    let tax = Model.fixed(transactions * price * this._taxRate - transactions * discount);

    // Take tax.
    this._grossRevenue = Model.fixed(this._grossRevenue + spend);
    this._grossIncome = Model.fixed(this._grossIncome + tax);
    this._reserve = Model.fixed(this._reserve + tax);

    // Spend.
    consumer._spent = Model.fixed(consumer._spent + spend);
    consumer._transactions += transactions;

    // Income.
    service._account = Model.fixed(service._account + income);
    service._transactions += transactions;

    return new Transaction({ service: service._id, consumer: consumer._id, transactions, price, discount, tax });
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

    // TODO(burdon): Service provider must get paid what asked for.

    // TODO(burdon): Calculate optimal price for service (or optimal staking).

    // TODO(burdon): Calculate discount based on percentage of stake and volume.
    // TODO(burdon): Maintain bank minimal reserve.
    // TODO(burdon): Maximal discount to maintain reserve (considering all other transaction).

    // TODO(burdon): Calculate current tax revenue and apportion to stake holders.
    // TODO(burdon): Calculate from all consumers for this kind of service.
    // TODO(burdon): Not all of budget will be used.
    let currentRevenue = budget * this._taxRate;

    // TODO(burdon): Our relative stake.
    let totalStake = this._stakes;
    let stakingPercentage = service._stake / totalStake;
    let allocation = currentRevenue * stakingPercentage;

    let transactions = Math.floor(budget / service._price);
    let discount = Model.fixed(allocation / transactions);

    return Model.fixed(service._price * (1 - discount));
  }
}

class Transaction {

  _data;

  constructor(data) {
    this._data = data;
  }

  get data() {
    return this._data;
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
