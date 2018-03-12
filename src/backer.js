//
// Copyright 2018 Wireline, Inc.
//

import { Util } from './util';

/**
 * Backer.
 */
export class Backer {

  _id = Util.name();
  _contracts = [];

  get id() {
    return this._id;
  }

  get contracts() {
    return this._contracts;
  }
}

/**
 * Smart contract.
 */
export class StakingContract {

  _service;
  _backer;
  _stake;

  constructor(service, backer, stake) {
    this._service = service;
    this._backer = backer;
    this._stake = stake;

    service.addStakingContract(this);
    backer._contracts.push(this);
  }

  get service() {
    return this._service;
  }

  get stake() {
    return this._stake;
  }
}
