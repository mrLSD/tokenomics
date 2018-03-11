//
// Copyright 2018 Wireline, Inc.
//

import { Bank } from './bank';
import { Model } from './model';
import { Service, ServiceContract } from './service';
import { Backer, StakingContract } from './backer';
import { Customer } from './customer';
import { Util } from './util';

test('sanity', () => {
  expect(true).toBe(true);
});

test('model', () => {
  Util.seed(1234);

  // TODO(burdon): Model reputation (# transactions, error rate).
  // TODO(burdon): Model contracts (backer, customer).
  // TODO(burdon): Model backers (looking for best reputation).

  let model = new Model(new Bank(0.05));

  let services = [
    new Service(0, 'compute'),
    new Service(0)
  ];

  let backers = [
    new Backer(services[1])
  ];

  let customers = [
    new Customer(10)
  ];

  new ServiceContract(services[0], services[1], 1);
  new ServiceContract(services[1], customers[0], 3);

  // TODO(burdon): Not implemented.
  new StakingContract(services[1], backers[0], 1);

  model
    .addServices(services)
    .addBackers(backers)
    .addCustomers(customers);

  model.run(3);

  console.log(JSON.stringify(model.info, null, 2));
});
