//
// Copyright 2018 Wireline, Inc.
//

import { Bank, Consumer, Model, Service } from './model';

test('sanity', () => {
  expect(true).toBe(true);
});

test('model', () => {
  Model.seed(1234);

  let model = new Model(new Bank(0.05));

  model.addConsumer(new Consumer(5.0));

  model.addService(new Service(2.0));
  model.addService(new Service(1.0));

  model.run(3);

  console.log('Model:', String(model));
  console.log('Consumers:', model._consumers);
  console.log('Services:', model._services);
});
