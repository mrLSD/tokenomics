//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';
import uuidv4 from 'uuid/v4';
import Chance from 'chance';

/**
 * Utils.
 */
export class Util {

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

/**
 * Economic Model.
 */
export class Model {

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
    console.assert(Util.fixed(serviceIncome + this._bank._grossIncome) === this._bank._grossRevenue);

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
      .mapValues(obj => obj.info)
      .value();
  }

  get consumers() {
    return _.chain(Array.from(this._consumers.values()))
      .keyBy('_id')
      .mapValues(obj => obj.info)
      .value();
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
        let transaction = this._bank.transaction(consumer, service);
        if (transaction) {
          this._ledger.push(transaction);
        }
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
    this._taxRate = Util.fixed(taxRate);
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
    let taxedPrice = Util.fixed(price * (1 + this._taxRate));
    let invocations = Math.floor(budget / taxedPrice);
    if (!invocations) {
      return;
    }

    let spend = Util.fixed(invocations * taxedPrice);
    let income = Util.fixed(invocations * service._price);

    let discount = Util.fixed(service._price - price);
    let tax = Util.fixed(invocations * price * this._taxRate - invocations * discount);

    // Take tax.
    this._grossRevenue = Util.fixed(this._grossRevenue + spend);
    this._grossIncome = Util.fixed(this._grossIncome + tax);
    this._reserve = Util.fixed(this._reserve + tax);

    // Spend.
    consumer._spent = Util.fixed(consumer._spent + spend);
    consumer._invocations += invocations;

    // Income.
    service._account = Util.fixed(service._account + income);
    service._invocations += invocations;

    return new Transaction({
      consumer: consumer._id,
      service: service._id,
      quantity:
      invocations,
      actualPrice: service._price,
      discount,
      dicountedPrice: price,
      tax
    });
  }

  /**
   * Calculate discounted price based on staking share and current volume.
   *
   * The service's price must be met, but the bank can apply a coupon from its tax revenue.
   * This will reduce in lower tax revenues for the bank, but it will maintain its minimal reserve.
   *
   * @param service
   * @param budget
   * @return {*}
   */
  calculateDicountedPrice(service, budget) {
    if (!service._stake) {
      return service._price;
    }

    // TODO(burdon): This model currently generates discounts based on stake.
    //     Instead generate tokens that can be used to provide discounts, or be sold/traded?

    // TODO(burdon): Calculate optimal price for service (or optimal staking). E.g., Adwords bidding.

    // TODO(burdon): Could be more generous and allocation portion of total revenue.
    let taxedPrice = Util.fixed(service._price * (1 + this._taxRate));
    let invocations = Math.floor(budget / taxedPrice);
    let spend = Util.fixed(invocations * taxedPrice);
    let potentialRevenue = spend * this._taxRate;

    // TODO(burdon): Need to trim services that are not competitive (e.g., have large stake, but priced out).
    // Our relative stake of the tax income.
    let totalStake = this._stakes;
    let stakingPercentage = service._stake / totalStake;
    let allocation = potentialRevenue * stakingPercentage;

    // Calculate pricing discount.
    let invocations2 = Math.floor(budget / service._price);
    let discount = Util.fixed(allocation / invocations2);

    return Util.fixed(service._price * (1 - discount));
  }
}

class Transaction {

  _data;

  constructor(data) {
    this._data = _.defaults({
      id: uuidv4()
    }, data);
  }
}

/**
 * Service.
 */
export class Service {

  _id = Util.name();

  _price;
  _stake;

  _account = 0;
  _invocations = 0;

  constructor(price=1, stake=0) {
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

/**
 * Consumer.
 */
export class Consumer {

  _id = Util.name();

  _budget;
  _stake;

  _spent = 0;
  _invocations = 0;

  constructor(budget=1, stake=0) {
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
