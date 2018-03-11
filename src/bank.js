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
