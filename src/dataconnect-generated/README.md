# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*UserRead*](#userread)
  - [*SubscriptionRead*](#subscriptionread)
  - [*DeviceRead*](#deviceread)
  - [*VaultRead*](#vaultread)
  - [*LogRead*](#logread)
  - [*PartnerAppsPublic*](#partnerappspublic)
- [**Mutations**](#mutations)
  - [*UserOperations*](#useroperations)
  - [*SubscriptionOperations*](#subscriptionoperations)
  - [*DeviceOperations*](#deviceoperations)
  - [*VaultOperations*](#vaultoperations)
  - [*LogOperations*](#logoperations)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## UserRead
You can execute the `UserRead` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
userRead(options?: ExecuteQueryOptions): QueryPromise<UserReadData, undefined>;

interface UserReadRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<UserReadData, undefined>;
}
export const userReadRef: UserReadRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
userRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<UserReadData, undefined>;

interface UserReadRef {
  ...
  (dc: DataConnect): QueryRef<UserReadData, undefined>;
}
export const userReadRef: UserReadRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the userReadRef:
```typescript
const name = userReadRef.operationName;
console.log(name);
```

### Variables
The `UserRead` query has no variables.
### Return Type
Recall that executing the `UserRead` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UserReadData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UserReadData {
  user?: {
    email: string;
    subscriptionStatus: string;
  };
  users: ({
    email: string;
  })[];
}
```
### Using `UserRead`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, userRead } from '@dataconnect/generated';


// Call the `userRead()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await userRead();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await userRead(dataConnect);

console.log(data.user);
console.log(data.users);

// Or, you can use the `Promise` API.
userRead().then((response) => {
  const data = response.data;
  console.log(data.user);
  console.log(data.users);
});
```

### Using `UserRead`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, userReadRef } from '@dataconnect/generated';


// Call the `userReadRef()` function to get a reference to the query.
const ref = userReadRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = userReadRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);
console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
  console.log(data.users);
});
```

## SubscriptionRead
You can execute the `SubscriptionRead` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
subscriptionRead(options?: ExecuteQueryOptions): QueryPromise<SubscriptionReadData, undefined>;

interface SubscriptionReadRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<SubscriptionReadData, undefined>;
}
export const subscriptionReadRef: SubscriptionReadRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
subscriptionRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<SubscriptionReadData, undefined>;

interface SubscriptionReadRef {
  ...
  (dc: DataConnect): QueryRef<SubscriptionReadData, undefined>;
}
export const subscriptionReadRef: SubscriptionReadRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the subscriptionReadRef:
```typescript
const name = subscriptionReadRef.operationName;
console.log(name);
```

### Variables
The `SubscriptionRead` query has no variables.
### Return Type
Recall that executing the `SubscriptionRead` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SubscriptionReadData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SubscriptionReadData {
  userSubscription?: {
    planType: string;
    status: string;
  };
  userSubscriptions: ({
    planType: string;
  })[];
}
```
### Using `SubscriptionRead`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, subscriptionRead } from '@dataconnect/generated';


// Call the `subscriptionRead()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await subscriptionRead();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await subscriptionRead(dataConnect);

console.log(data.userSubscription);
console.log(data.userSubscriptions);

// Or, you can use the `Promise` API.
subscriptionRead().then((response) => {
  const data = response.data;
  console.log(data.userSubscription);
  console.log(data.userSubscriptions);
});
```

### Using `SubscriptionRead`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, subscriptionReadRef } from '@dataconnect/generated';


// Call the `subscriptionReadRef()` function to get a reference to the query.
const ref = subscriptionReadRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = subscriptionReadRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userSubscription);
console.log(data.userSubscriptions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userSubscription);
  console.log(data.userSubscriptions);
});
```

## DeviceRead
You can execute the `DeviceRead` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deviceRead(options?: ExecuteQueryOptions): QueryPromise<DeviceReadData, undefined>;

interface DeviceReadRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<DeviceReadData, undefined>;
}
export const deviceReadRef: DeviceReadRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
deviceRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<DeviceReadData, undefined>;

interface DeviceReadRef {
  ...
  (dc: DataConnect): QueryRef<DeviceReadData, undefined>;
}
export const deviceReadRef: DeviceReadRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deviceReadRef:
```typescript
const name = deviceReadRef.operationName;
console.log(name);
```

### Variables
The `DeviceRead` query has no variables.
### Return Type
Recall that executing the `DeviceRead` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeviceReadData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeviceReadData {
  device?: {
    deviceName: string;
  };
  devices: ({
    deviceName: string;
  })[];
}
```
### Using `DeviceRead`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deviceRead } from '@dataconnect/generated';


// Call the `deviceRead()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deviceRead();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deviceRead(dataConnect);

console.log(data.device);
console.log(data.devices);

// Or, you can use the `Promise` API.
deviceRead().then((response) => {
  const data = response.data;
  console.log(data.device);
  console.log(data.devices);
});
```

### Using `DeviceRead`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, deviceReadRef } from '@dataconnect/generated';


// Call the `deviceReadRef()` function to get a reference to the query.
const ref = deviceReadRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deviceReadRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.device);
console.log(data.devices);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.device);
  console.log(data.devices);
});
```

## VaultRead
You can execute the `VaultRead` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
vaultRead(options?: ExecuteQueryOptions): QueryPromise<VaultReadData, undefined>;

interface VaultReadRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<VaultReadData, undefined>;
}
export const vaultReadRef: VaultReadRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
vaultRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<VaultReadData, undefined>;

interface VaultReadRef {
  ...
  (dc: DataConnect): QueryRef<VaultReadData, undefined>;
}
export const vaultReadRef: VaultReadRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the vaultReadRef:
```typescript
const name = vaultReadRef.operationName;
console.log(name);
```

### Variables
The `VaultRead` query has no variables.
### Return Type
Recall that executing the `VaultRead` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `VaultReadData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface VaultReadData {
  vaultItem?: {
    title: string;
  };
  vaultItems: ({
    title: string;
  })[];
}
```
### Using `VaultRead`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, vaultRead } from '@dataconnect/generated';


// Call the `vaultRead()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await vaultRead();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await vaultRead(dataConnect);

console.log(data.vaultItem);
console.log(data.vaultItems);

// Or, you can use the `Promise` API.
vaultRead().then((response) => {
  const data = response.data;
  console.log(data.vaultItem);
  console.log(data.vaultItems);
});
```

### Using `VaultRead`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, vaultReadRef } from '@dataconnect/generated';


// Call the `vaultReadRef()` function to get a reference to the query.
const ref = vaultReadRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = vaultReadRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.vaultItem);
console.log(data.vaultItems);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.vaultItem);
  console.log(data.vaultItems);
});
```

## LogRead
You can execute the `LogRead` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
logRead(options?: ExecuteQueryOptions): QueryPromise<LogReadData, undefined>;

interface LogReadRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<LogReadData, undefined>;
}
export const logReadRef: LogReadRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
logRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<LogReadData, undefined>;

interface LogReadRef {
  ...
  (dc: DataConnect): QueryRef<LogReadData, undefined>;
}
export const logReadRef: LogReadRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the logReadRef:
```typescript
const name = logReadRef.operationName;
console.log(name);
```

### Variables
The `LogRead` query has no variables.
### Return Type
Recall that executing the `LogRead` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LogReadData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogReadData {
  authLog?: {
    status: string;
  };
  authLogs: ({
    timestamp: TimestampString;
    status: string;
  })[];
}
```
### Using `LogRead`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logRead } from '@dataconnect/generated';


// Call the `logRead()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await logRead();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await logRead(dataConnect);

console.log(data.authLog);
console.log(data.authLogs);

// Or, you can use the `Promise` API.
logRead().then((response) => {
  const data = response.data;
  console.log(data.authLog);
  console.log(data.authLogs);
});
```

### Using `LogRead`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, logReadRef } from '@dataconnect/generated';


// Call the `logReadRef()` function to get a reference to the query.
const ref = logReadRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = logReadRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.authLog);
console.log(data.authLogs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.authLog);
  console.log(data.authLogs);
});
```

## PartnerAppsPublic
You can execute the `PartnerAppsPublic` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
partnerAppsPublic(options?: ExecuteQueryOptions): QueryPromise<PartnerAppsPublicData, undefined>;

interface PartnerAppsPublicRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<PartnerAppsPublicData, undefined>;
}
export const partnerAppsPublicRef: PartnerAppsPublicRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
partnerAppsPublic(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<PartnerAppsPublicData, undefined>;

interface PartnerAppsPublicRef {
  ...
  (dc: DataConnect): QueryRef<PartnerAppsPublicData, undefined>;
}
export const partnerAppsPublicRef: PartnerAppsPublicRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the partnerAppsPublicRef:
```typescript
const name = partnerAppsPublicRef.operationName;
console.log(name);
```

### Variables
The `PartnerAppsPublic` query has no variables.
### Return Type
Recall that executing the `PartnerAppsPublic` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `PartnerAppsPublicData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface PartnerAppsPublicData {
  partnerApps: ({
    appName: string;
    organizationName?: string | null;
  })[];
}
```
### Using `PartnerAppsPublic`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, partnerAppsPublic } from '@dataconnect/generated';


// Call the `partnerAppsPublic()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await partnerAppsPublic();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await partnerAppsPublic(dataConnect);

console.log(data.partnerApps);

// Or, you can use the `Promise` API.
partnerAppsPublic().then((response) => {
  const data = response.data;
  console.log(data.partnerApps);
});
```

### Using `PartnerAppsPublic`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, partnerAppsPublicRef } from '@dataconnect/generated';


// Call the `partnerAppsPublicRef()` function to get a reference to the query.
const ref = partnerAppsPublicRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = partnerAppsPublicRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.partnerApps);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.partnerApps);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UserOperations
You can execute the `UserOperations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
userOperations(vars: UserOperationsVariables): MutationPromise<UserOperationsData, UserOperationsVariables>;

interface UserOperationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UserOperationsVariables): MutationRef<UserOperationsData, UserOperationsVariables>;
}
export const userOperationsRef: UserOperationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
userOperations(dc: DataConnect, vars: UserOperationsVariables): MutationPromise<UserOperationsData, UserOperationsVariables>;

interface UserOperationsRef {
  ...
  (dc: DataConnect, vars: UserOperationsVariables): MutationRef<UserOperationsData, UserOperationsVariables>;
}
export const userOperationsRef: UserOperationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the userOperationsRef:
```typescript
const name = userOperationsRef.operationName;
console.log(name);
```

### Variables
The `UserOperations` mutation requires an argument of type `UserOperationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UserOperationsVariables {
  email: string;
  subscriptionStatus: string;
}
```
### Return Type
Recall that executing the `UserOperations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UserOperationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UserOperationsData {
  user_insert: User_Key;
  user_update?: User_Key | null;
  user_delete?: User_Key | null;
}
```
### Using `UserOperations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, userOperations, UserOperationsVariables } from '@dataconnect/generated';

// The `UserOperations` mutation requires an argument of type `UserOperationsVariables`:
const userOperationsVars: UserOperationsVariables = {
  email: ..., 
  subscriptionStatus: ..., 
};

// Call the `userOperations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await userOperations(userOperationsVars);
// Variables can be defined inline as well.
const { data } = await userOperations({ email: ..., subscriptionStatus: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await userOperations(dataConnect, userOperationsVars);

console.log(data.user_insert);
console.log(data.user_update);
console.log(data.user_delete);

// Or, you can use the `Promise` API.
userOperations(userOperationsVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
  console.log(data.user_update);
  console.log(data.user_delete);
});
```

### Using `UserOperations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, userOperationsRef, UserOperationsVariables } from '@dataconnect/generated';

// The `UserOperations` mutation requires an argument of type `UserOperationsVariables`:
const userOperationsVars: UserOperationsVariables = {
  email: ..., 
  subscriptionStatus: ..., 
};

// Call the `userOperationsRef()` function to get a reference to the mutation.
const ref = userOperationsRef(userOperationsVars);
// Variables can be defined inline as well.
const ref = userOperationsRef({ email: ..., subscriptionStatus: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = userOperationsRef(dataConnect, userOperationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);
console.log(data.user_update);
console.log(data.user_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
  console.log(data.user_update);
  console.log(data.user_delete);
});
```

## SubscriptionOperations
You can execute the `SubscriptionOperations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
subscriptionOperations(vars: SubscriptionOperationsVariables): MutationPromise<SubscriptionOperationsData, SubscriptionOperationsVariables>;

interface SubscriptionOperationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SubscriptionOperationsVariables): MutationRef<SubscriptionOperationsData, SubscriptionOperationsVariables>;
}
export const subscriptionOperationsRef: SubscriptionOperationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
subscriptionOperations(dc: DataConnect, vars: SubscriptionOperationsVariables): MutationPromise<SubscriptionOperationsData, SubscriptionOperationsVariables>;

interface SubscriptionOperationsRef {
  ...
  (dc: DataConnect, vars: SubscriptionOperationsVariables): MutationRef<SubscriptionOperationsData, SubscriptionOperationsVariables>;
}
export const subscriptionOperationsRef: SubscriptionOperationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the subscriptionOperationsRef:
```typescript
const name = subscriptionOperationsRef.operationName;
console.log(name);
```

### Variables
The `SubscriptionOperations` mutation requires an argument of type `SubscriptionOperationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SubscriptionOperationsVariables {
  planType: string;
  startDate: DateString;
  expiryDate: DateString;
  status: string;
}
```
### Return Type
Recall that executing the `SubscriptionOperations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SubscriptionOperationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SubscriptionOperationsData {
  userSubscription_insert: UserSubscription_Key;
  userSubscription_update?: UserSubscription_Key | null;
  userSubscription_delete?: UserSubscription_Key | null;
}
```
### Using `SubscriptionOperations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, subscriptionOperations, SubscriptionOperationsVariables } from '@dataconnect/generated';

// The `SubscriptionOperations` mutation requires an argument of type `SubscriptionOperationsVariables`:
const subscriptionOperationsVars: SubscriptionOperationsVariables = {
  planType: ..., 
  startDate: ..., 
  expiryDate: ..., 
  status: ..., 
};

// Call the `subscriptionOperations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await subscriptionOperations(subscriptionOperationsVars);
// Variables can be defined inline as well.
const { data } = await subscriptionOperations({ planType: ..., startDate: ..., expiryDate: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await subscriptionOperations(dataConnect, subscriptionOperationsVars);

console.log(data.userSubscription_insert);
console.log(data.userSubscription_update);
console.log(data.userSubscription_delete);

// Or, you can use the `Promise` API.
subscriptionOperations(subscriptionOperationsVars).then((response) => {
  const data = response.data;
  console.log(data.userSubscription_insert);
  console.log(data.userSubscription_update);
  console.log(data.userSubscription_delete);
});
```

### Using `SubscriptionOperations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, subscriptionOperationsRef, SubscriptionOperationsVariables } from '@dataconnect/generated';

// The `SubscriptionOperations` mutation requires an argument of type `SubscriptionOperationsVariables`:
const subscriptionOperationsVars: SubscriptionOperationsVariables = {
  planType: ..., 
  startDate: ..., 
  expiryDate: ..., 
  status: ..., 
};

// Call the `subscriptionOperationsRef()` function to get a reference to the mutation.
const ref = subscriptionOperationsRef(subscriptionOperationsVars);
// Variables can be defined inline as well.
const ref = subscriptionOperationsRef({ planType: ..., startDate: ..., expiryDate: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = subscriptionOperationsRef(dataConnect, subscriptionOperationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userSubscription_insert);
console.log(data.userSubscription_update);
console.log(data.userSubscription_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userSubscription_insert);
  console.log(data.userSubscription_update);
  console.log(data.userSubscription_delete);
});
```

## DeviceOperations
You can execute the `DeviceOperations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deviceOperations(vars: DeviceOperationsVariables): MutationPromise<DeviceOperationsData, DeviceOperationsVariables>;

interface DeviceOperationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeviceOperationsVariables): MutationRef<DeviceOperationsData, DeviceOperationsVariables>;
}
export const deviceOperationsRef: DeviceOperationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deviceOperations(dc: DataConnect, vars: DeviceOperationsVariables): MutationPromise<DeviceOperationsData, DeviceOperationsVariables>;

interface DeviceOperationsRef {
  ...
  (dc: DataConnect, vars: DeviceOperationsVariables): MutationRef<DeviceOperationsData, DeviceOperationsVariables>;
}
export const deviceOperationsRef: DeviceOperationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deviceOperationsRef:
```typescript
const name = deviceOperationsRef.operationName;
console.log(name);
```

### Variables
The `DeviceOperations` mutation requires an argument of type `DeviceOperationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeviceOperationsVariables {
  deviceName: string;
  publicKey: string;
}
```
### Return Type
Recall that executing the `DeviceOperations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeviceOperationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeviceOperationsData {
  device_insert: Device_Key;
  device_update?: Device_Key | null;
  device_delete?: Device_Key | null;
}
```
### Using `DeviceOperations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deviceOperations, DeviceOperationsVariables } from '@dataconnect/generated';

// The `DeviceOperations` mutation requires an argument of type `DeviceOperationsVariables`:
const deviceOperationsVars: DeviceOperationsVariables = {
  deviceName: ..., 
  publicKey: ..., 
};

// Call the `deviceOperations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deviceOperations(deviceOperationsVars);
// Variables can be defined inline as well.
const { data } = await deviceOperations({ deviceName: ..., publicKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deviceOperations(dataConnect, deviceOperationsVars);

console.log(data.device_insert);
console.log(data.device_update);
console.log(data.device_delete);

// Or, you can use the `Promise` API.
deviceOperations(deviceOperationsVars).then((response) => {
  const data = response.data;
  console.log(data.device_insert);
  console.log(data.device_update);
  console.log(data.device_delete);
});
```

### Using `DeviceOperations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deviceOperationsRef, DeviceOperationsVariables } from '@dataconnect/generated';

// The `DeviceOperations` mutation requires an argument of type `DeviceOperationsVariables`:
const deviceOperationsVars: DeviceOperationsVariables = {
  deviceName: ..., 
  publicKey: ..., 
};

// Call the `deviceOperationsRef()` function to get a reference to the mutation.
const ref = deviceOperationsRef(deviceOperationsVars);
// Variables can be defined inline as well.
const ref = deviceOperationsRef({ deviceName: ..., publicKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deviceOperationsRef(dataConnect, deviceOperationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.device_insert);
console.log(data.device_update);
console.log(data.device_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.device_insert);
  console.log(data.device_update);
  console.log(data.device_delete);
});
```

## VaultOperations
You can execute the `VaultOperations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
vaultOperations(vars: VaultOperationsVariables): MutationPromise<VaultOperationsData, VaultOperationsVariables>;

interface VaultOperationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: VaultOperationsVariables): MutationRef<VaultOperationsData, VaultOperationsVariables>;
}
export const vaultOperationsRef: VaultOperationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
vaultOperations(dc: DataConnect, vars: VaultOperationsVariables): MutationPromise<VaultOperationsData, VaultOperationsVariables>;

interface VaultOperationsRef {
  ...
  (dc: DataConnect, vars: VaultOperationsVariables): MutationRef<VaultOperationsData, VaultOperationsVariables>;
}
export const vaultOperationsRef: VaultOperationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the vaultOperationsRef:
```typescript
const name = vaultOperationsRef.operationName;
console.log(name);
```

### Variables
The `VaultOperations` mutation requires an argument of type `VaultOperationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface VaultOperationsVariables {
  title: string;
  encryptedContent: string;
}
```
### Return Type
Recall that executing the `VaultOperations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `VaultOperationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface VaultOperationsData {
  vaultItem_insert: VaultItem_Key;
  vaultItem_update?: VaultItem_Key | null;
  vaultItem_delete?: VaultItem_Key | null;
}
```
### Using `VaultOperations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, vaultOperations, VaultOperationsVariables } from '@dataconnect/generated';

// The `VaultOperations` mutation requires an argument of type `VaultOperationsVariables`:
const vaultOperationsVars: VaultOperationsVariables = {
  title: ..., 
  encryptedContent: ..., 
};

// Call the `vaultOperations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await vaultOperations(vaultOperationsVars);
// Variables can be defined inline as well.
const { data } = await vaultOperations({ title: ..., encryptedContent: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await vaultOperations(dataConnect, vaultOperationsVars);

console.log(data.vaultItem_insert);
console.log(data.vaultItem_update);
console.log(data.vaultItem_delete);

// Or, you can use the `Promise` API.
vaultOperations(vaultOperationsVars).then((response) => {
  const data = response.data;
  console.log(data.vaultItem_insert);
  console.log(data.vaultItem_update);
  console.log(data.vaultItem_delete);
});
```

### Using `VaultOperations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, vaultOperationsRef, VaultOperationsVariables } from '@dataconnect/generated';

// The `VaultOperations` mutation requires an argument of type `VaultOperationsVariables`:
const vaultOperationsVars: VaultOperationsVariables = {
  title: ..., 
  encryptedContent: ..., 
};

// Call the `vaultOperationsRef()` function to get a reference to the mutation.
const ref = vaultOperationsRef(vaultOperationsVars);
// Variables can be defined inline as well.
const ref = vaultOperationsRef({ title: ..., encryptedContent: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = vaultOperationsRef(dataConnect, vaultOperationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.vaultItem_insert);
console.log(data.vaultItem_update);
console.log(data.vaultItem_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.vaultItem_insert);
  console.log(data.vaultItem_update);
  console.log(data.vaultItem_delete);
});
```

## LogOperations
You can execute the `LogOperations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
logOperations(vars: LogOperationsVariables): MutationPromise<LogOperationsData, LogOperationsVariables>;

interface LogOperationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogOperationsVariables): MutationRef<LogOperationsData, LogOperationsVariables>;
}
export const logOperationsRef: LogOperationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
logOperations(dc: DataConnect, vars: LogOperationsVariables): MutationPromise<LogOperationsData, LogOperationsVariables>;

interface LogOperationsRef {
  ...
  (dc: DataConnect, vars: LogOperationsVariables): MutationRef<LogOperationsData, LogOperationsVariables>;
}
export const logOperationsRef: LogOperationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the logOperationsRef:
```typescript
const name = logOperationsRef.operationName;
console.log(name);
```

### Variables
The `LogOperations` mutation requires an argument of type `LogOperationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LogOperationsVariables {
  status: string;
  ipAddress: string;
  appId: UUIDString;
  deviceId: UUIDString;
}
```
### Return Type
Recall that executing the `LogOperations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LogOperationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogOperationsData {
  authLog_insert: AuthLog_Key;
  authLog_update?: AuthLog_Key | null;
  authLog_delete?: AuthLog_Key | null;
}
```
### Using `LogOperations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logOperations, LogOperationsVariables } from '@dataconnect/generated';

// The `LogOperations` mutation requires an argument of type `LogOperationsVariables`:
const logOperationsVars: LogOperationsVariables = {
  status: ..., 
  ipAddress: ..., 
  appId: ..., 
  deviceId: ..., 
};

// Call the `logOperations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await logOperations(logOperationsVars);
// Variables can be defined inline as well.
const { data } = await logOperations({ status: ..., ipAddress: ..., appId: ..., deviceId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await logOperations(dataConnect, logOperationsVars);

console.log(data.authLog_insert);
console.log(data.authLog_update);
console.log(data.authLog_delete);

// Or, you can use the `Promise` API.
logOperations(logOperationsVars).then((response) => {
  const data = response.data;
  console.log(data.authLog_insert);
  console.log(data.authLog_update);
  console.log(data.authLog_delete);
});
```

### Using `LogOperations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, logOperationsRef, LogOperationsVariables } from '@dataconnect/generated';

// The `LogOperations` mutation requires an argument of type `LogOperationsVariables`:
const logOperationsVars: LogOperationsVariables = {
  status: ..., 
  ipAddress: ..., 
  appId: ..., 
  deviceId: ..., 
};

// Call the `logOperationsRef()` function to get a reference to the mutation.
const ref = logOperationsRef(logOperationsVars);
// Variables can be defined inline as well.
const ref = logOperationsRef({ status: ..., ipAddress: ..., appId: ..., deviceId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = logOperationsRef(dataConnect, logOperationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.authLog_insert);
console.log(data.authLog_update);
console.log(data.authLog_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.authLog_insert);
  console.log(data.authLog_update);
  console.log(data.authLog_delete);
});
```

