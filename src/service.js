//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';

import { Util } from './util';
import { Transaction } from './bank';
import { Consumer } from './customer';

/**
 * Service.
 */
export class Service extends Consumer {

  _id;
  _invocations = 0;
  _earnings = 0;
  _costs = 0;
  _taxes = 0;

  get id() {
    return this._id;
  }

  get info() {
    return {
      invocations: this._invocations,
      account: this._account.info,
      earnings: this._earnings,
      costs: this._costs,
      taxes: this._taxes
    };
  }

  constructor(balance=0, id) {
    super(balance);
    this._id = id || Util.name();
  }

  /**
   * Net income.
   * @return {number}
   */
  get income() {
    return this._earnings - this._costs;
  }

  get taxes() {
    return this._taxes;
  }

  /**
   * Calculate cost of service (including sub-contracts).
   * @return {*}
   */
  get cost() {
    let cost = 0;
    _.each(this._contracts, contract => {
      cost += contract.price;
    });

    return cost;
  }

  /**
   * Execute transaction at price.
   * @param price
   * @param taxRate
   * @return {Number} taxes
   */
  execute(price, taxRate) {
    this._invocations++;

    let cost = this.cost;
    this._account.add(price - cost);

    let taxes = Util.fixed(price * taxRate);

    this._earnings += price;
    this._costs = Util.fixed(this._costs + cost + taxes);
    this._taxes = Util.fixed(this._taxes + taxes);

    // Pay sub-services.
    _.each(this._contracts, contract => {
      taxes += contract._service.execute(contract.price, taxRate);
    });

    return taxes;
  }
}

/**
 * Smart contract.
 */
export class ServiceContract {

  _service;
  _customer;
  _price;

  constructor(service, customer, price) {
    this._service = service;
    this._customer = customer;
    this._price = price;

    customer._contracts.push(this);
  }

  get price() {
    return this._price;
  }

  execute(taxRate) {

    // Check service can run.
    if (this._service.account.balance + this._service.price < this._service.cost) {
      console.log('Insufficient balance: ' + this._service.id);
      return;
    }

    // Charge customer.
    if (this._customer.account.spend(this)) {

      // Execute service.
      let taxes = this._service.execute(this.price, taxRate);

      return new Transaction({
        customer: this._customer.id,
        service: this._service.id,
        amount: this._price,
        taxes
      });
    }
  }
}
