//
// Copyright 2018 Wireline, Inc.
//

import _ from 'lodash';

import { Bank, Consumer, Model, Service } from './model';

test('sanity', () => {
  expect(true).toBe(true);
});

test('model', () => {
  Model.seed(1234);

  let model = new Model(new Bank(0.1, 0));

  model.addConsumer(new Consumer(5.0));

  model.addService(new Service(1.05, 5));
  model.addService(new Service(1.0, 1));
  model.addService(new Service(1.0, 2));

  model.run(1);

  console.log('Model:', JSON.stringify(model.info, null, 2));

  console.log('Services:', JSON.stringify(model.services, null, 2));

  console.log('Consumers:', JSON.stringify(model.consumers, null, 2));

  console.log('Ledger:', JSON.stringify(model.ledger, null, 2));
});
