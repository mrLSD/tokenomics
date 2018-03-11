//
// Copyright 2018 Wireline, Inc.
//

import { Bank } from './bank';
import { Model } from './model';
import { Consumer } from './consumer';
import { Service } from './service';
import { Util } from './util';

test('sanity', () => {
  expect(true).toBe(true);
});

test('model', () => {
  Util.seed(1234);

  let model = new Model(new Bank(0.1, 0));

  model.addConsumer(new Consumer(5.0));
  model.addConsumer(new Consumer(1.0));       // Too low to trigger transaction.
  model.addConsumer(new Consumer(2.0));

  model.addService(new Service(1.2, 7));
  model.addService(new Service(1.05, 5));     // Best market price.
  model.addService(new Service(1.0));         // Lowest ask price.

  model.run(1);

  console.log('Model:', JSON.stringify(model.info, null, 2));

  console.log('Services:', JSON.stringify(model.services, null, 2));

  console.log('Consumers:', JSON.stringify(model.consumers, null, 2));

  console.log('Ledger:', JSON.stringify(model.ledger, null, 2));
});
